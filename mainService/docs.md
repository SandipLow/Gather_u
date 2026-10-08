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

### Guest Player (Instant Join)

- **Endpoint**: `POST /user/guest`
- **Description**: Creates a temporary guest player for instant access to the "Open World". No authentication is required.
- **Request Body**:
  ```json
  {
    "name": "string",
    "spritesheet": "string"
  }
  ```
- **Response**:
  ```json
  {
    "player": {
      "id": "string (tmp_...)",
      "name": "string",
      "wealth": 0,
      "spritesheet": "string",
      "checkpoint": {
        "x": 0,
        "y": 0
      }
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

The WebSocket server handles real-time player and vehicle interactions, chat, and synchronization across worlds.

### Connecting

- **URL**: `ws://<main-service-host>/?token=<player-token>`
- **Note**: The `player-token` is obtained from the `GET /user/:playerId` endpoint or `POST /user/guest`.

### Message Envelope Structure

All messages exchanged over WebSocket follow the standard envelope format:
```json
{
  "type": "string",
  "payload": {}
}
```

---

### Incoming Events (Server → Client)

#### 1. `init`
Sent to the connecting client immediately upon entering the world, containing the full initial snapshot of self, other players, and vehicles.
- **Payload**:
  ```json
  {
    "self": {
      "id": "string",
      "name": "string",
      "spritesheet": "string",
      "wealth": "number",
      "checkpoint": { "x": "number", "y": "number" },
      "position": { "x": "number", "y": "number" },
      "animation": "string",
      "timestamp": "number",
      "isDriving": "string | undefined"
    },
    "players": [
      {
        "id": "string",
        "name": "string",
        "spritesheet": "string",
        "wealth": "number",
        "checkpoint": { "x": "number", "y": "number" },
        "position": { "x": "number", "y": "number" },
        "animation": "string",
        "timestamp": "number",
        "isDriving": "string | undefined"
      }
    ],
    "cars": [
      {
        "id": "string",
        "spriteKey": "string",
        "position": { "x": "number", "y": "number", "angle": "number" },
        "isDriving": "string | null",
        "timestamp": "number"
      }
    ]
  }
  ```

#### 2. `enter`
Broadcast to other players in the world when a new player joins.
- **Payload**:
  ```json
  {
    "player": {
      "id": "string",
      "name": "string",
      "spritesheet": "string",
      "wealth": "number",
      "checkpoint": { "x": "number", "y": "number" },
      "position": { "x": "number", "y": "number" },
      "animation": "string",
      "timestamp": "number",
      "isDriving": "string | undefined"
    }
  }
  ```

#### 3. `leave`
Broadcast to players when another player disconnects or leaves the world.
- **Payload**:
  ```json
  {
    "playerId": "string"
  }
  ```

#### 4. `move`
Broadcast when an on-foot player moves within proximity.
- **Payload**:
  ```json
  {
    "playerId": "string",
    "x": "number",
    "y": "number",
    "animation": "string",
    "timestamp": "number"
  }
  ```

#### 5. `enter_car`
Broadcast when a player enters/takes control of a vehicle (also sent back to confirming client upon success).
- **Payload**:
  ```json
  {
    "playerId": "string",
    "carId": "string"
  }
  ```

#### 6. `leave_car`
Broadcast when a player disembarks from a vehicle.
- **Payload**:
  ```json
  {
    "playerId": "string",
    "carId": "string"
  }
  ```

#### 7. `move_car`
Broadcast when a player driving a vehicle moves or rotates.
- **Payload**:
  ```json
  {
    "playerId": "string",
    "carId": "string",
    "x": "number",
    "y": "number",
    "angle": "number"
  }
  ```

#### 8. `talk`
Delivered when a chat message is received from another player.
- **Payload**:
  ```json
  {
    "from": "string (playerId)",
    "message": "string"
  }
  ```

#### 9. `pong`
Server response to client heartbeat `ping`.
- **Payload**:
  ```json
  {
    "timestamp": "number"
  }
  ```

#### 10. `error`
Sent when a request fails (e.g. attempting to enter a car already occupied by someone else).
- **Payload**:
  ```json
  {
    "message": "string"
  }
  ```

---

### Outgoing Events (Client → Server)

#### 1. `move`
Broadcast local player movement on foot.
- **Payload**:
  ```json
  {
    "x": "number",
    "y": "number",
    "animation": "string",
    "timestamp": "number"
  }
  ```

#### 2. `enter_car`
Request to enter and take control of a specific vehicle.
- **Payload**:
  ```json
  {
    "carId": "string"
  }
  ```

#### 3. `leave_car`
Notify the server that the player has exited their vehicle.
- **Payload**:
  ```json
  {
    "carId": "string"
  }
  ```

#### 4. `move_car`
Broadcast vehicle position and orientation while driving.
- **Payload**:
  ```json
  {
    "carId": "string",
    "x": "number",
    "y": "number",
    "angle": "number"
  }
  ```

#### 5. `talk`
Send a chat message to specific recipient player IDs.
- **Payload**:
  ```json
  {
    "players": ["string (playerId)"],
    "message": "string"
  }
  ```

#### 6. `ping`
Heartbeat check to determine latency.
- **Payload**:
  ```json
  {
    "timestamp": "number"
  }
  ```

---

## Media Streaming (SFU) [Experimental]

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
