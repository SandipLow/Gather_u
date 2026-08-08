# GatherU API Documentation

This document provides a comprehensive guide to the GatherU API, which allows client applications to interact with the game world. All endpoints are accessed through the `mainService`.

## Base URL

All API endpoints are relative to the `mainService`'s base URL.

---

## User Management

These endpoints manage user registration, authentication, and data.

### Register a New User

- **Endpoint**: `POST /user`
- **Description**: Creates a new user account.
- **Request Body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "token": "string"
  }
  ```

### User Login

- **Endpoint**: `POST /user/login`
- **Description**: Authenticates a user and returns a session token.
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "token": "string"
  }
  ```

### Get User Data

- **Endpoint**: `GET /user`
- **Description**: Retrieves the authenticated user's data, including their players.
- **Authentication**: Requires a valid JWT in the `Authorization` header.
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "players": [
      {
        "id": "string",
        "user_id": "string",
        "world_id": "string",
        "name": "string",
        "wealth": "number",
        "spritesheet": "string",
        "checkpoint": {
          "x": "number",
          "y": "number"
        }
      }
    ]
  }
  ```

### Update User Data

- **Endpoint**: `PUT /user`
- **Description**: Updates the authenticated user's data.
- **Authentication**: Requires a valid JWT in the `Authorization` header.
- **Response**:
  ```json
  {
    "message": "User updated successfully"
  }
  ```

---

## Player Management

These endpoints handle player creation and data retrieval.

### Create a New Player

- **Endpoint**: `POST /user/player`
- **Description**: Creates a new player for the authenticated user.
- **Authentication**: Requires a valid JWT in the `Authorization` header.
- **Request Body**:
  ```json
  {
    "name": "string",
    "world_id": "string",
    "spritesheet": "string",
    "wealth": "number",
    "checkpoint": {
      "x": "number",
      "y": "number"
    }
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "user_id": "string",
    "world_id": "string",
    "name": "string",
    "wealth": "number",
    "spritesheet": "string",
    "checkpoint": {
      "x": "number",
      "y": "number"
    }
  }
  ```

### Get Player Token

- **Endpoint**: `GET /user/:playerId`
- **Description**: Retrieves a player-specific JWT for connecting to the WebSocket and SFU services.
- **Authentication**: Requires a valid JWT in the `Authorization` header.
- **Response**:
  ```json
  {
    "playerToken": "string"
  }
  ```

### Get Public Player Data

- **Endpoint**: `GET /user/:playerId/public`
- **Description**: Retrieves public information about a specific player.
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "wealth": "number",
    "spritesheet": "string",
    "checkpoint": {
      "x": "number",
      "y": "number"
    }
  }
  ```

---

## World Management

These endpoints are for creating and searching for game worlds.

### Create a New World

- **Endpoint**: `POST /world`
- **Description**: Creates a new game world.
- **Authentication**: Requires a valid JWT in the `Authorization` header.
- **Request Body**:
  ```json
  {
    "name": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string"
  }
  ```

### Search for Worlds

- **Endpoint**: `GET /world/search`
- **Description**: Searches for worlds by name.
- **Query Parameter**: `q` (the search term)
- **Response**:
  ```json
  [
    {
      "id": "string",
      "name": "string"
    }
  ]
  ```

---

## Real-time Communication (WebSocket)

The WebSocket server handles real-time player interactions.

### Connecting

- **URL**: `ws://<main-service-host>/?token=<player-token>`
- **Note**: The `player-token` is obtained from the `GET /user/:playerId` endpoint.

### WebSocket Events

sample Format: 
```json
  {
    "type": "string",
    "payload": "Payload" 
  }
```

#### Incoming Events

- **`enter`**: A player has entered your area of interest.
  - **Payload**: `{ "playerId": "string" }`
- **`leave`**: A player has left your area of interest.
  - **Payload**: `{ "playerId": "string" }`
- **`move`**: A player has moved.
  - **Payload**: `{ "playerId": "string", "x": "number", "y": "number", "animation": "string", "timestamp": "number" }`
- **`talk`**: You have received a message from another player.
  - **Payload**: `{ "from": "string", "message": "string" }`

#### Outgoing Events

- **`move`**: Broadcast your player's movement.
  - **Payload**: `{ "x": "number", "y": "number", "animation": "string", "timestamp": "number" }`
- **`talk`**: Send a message to specific players.
  - **Payload**: `{ "players": ["playerId1", "playerId2"], "message": "string" }`

---

## Media Streaming (SFU)

The Selective Forwarding Unit (SFU) manages video and audio streaming between players.

### Get SFU Capabilities

- **Endpoint**: `GET /sfu/capabilities`
- **Description**: Retrieves the server's media streaming capabilities.
- **Response**: Mediasoup router capabilities object.

### Create WebRTC Transport

- **Endpoint**: `POST /sfu/transport/:playerId`
- **Description**: Creates a WebRTC transport for a player.
- **Response**: Transport information object.

### Connect WebRTC Transport

- **Endpoint**: `POST /sfu/connect/:playerId/:direction`
- **Description**: Connects a transport for sending (`send`) or receiving (`recv`) media.
- **URL Parameters**:
  - `direction`: `"send"` or `"recv"`
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```

### Start Producing a Stream

- **Endpoint**: `POST /sfu/produce/:playerId`
- **Description**: Begins sending a media stream (audio or video).
- **Request Body**:
  ```json
  {
    "kind": "audio" | "video",
    "rtpParameters": { ... }
  }
  ```
- **Response**: Producer information object.

### Receive a Stream

- **Endpoint**: `POST /sfu/getstream/:consumerPlayerId/:targetPlayerId`
- **Description**: Subscribes to another player's media stream.
- **Response**: Consumer information object.

### Stop Receiving a Stream

- **Endpoint**: `POST /sfu/removeStream/:consumerPlayerId/:targetPlayerId`
- **Description**: Unsubscribes from another player's media stream.
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```
