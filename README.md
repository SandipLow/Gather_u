# Gather_u

A real-time multiplayer RPG game built with modern web technologies, featuring character selection, world exploration, and live player interactions.

## 🎮 Overview

Gather_u is a browser-based multiplayer RPG where players can create characters, explore different worlds, and interact with other players in real-time. The game features a retro pixel art style with 16x16 character sprites and tile-based environments.

## 🏗️ Architecture

The project follows a client-server architecture:

### Client (`/client`)

- **Framework**: Svelte + TypeScript + Vite
- **Game Engine**: Phaser.js for 2D game rendering and physics
- **Styling**: Component-scoped CSS
- **Build Tool**: Vite for fast development and optimized builds

### Server (`/server`)

- **Runtime**: Node.js + TypeScript
- **Web Framework**: Express.js for HTTP endpoints
- **Real-time Communication**: WebSocket for live player interactions
- **Database**: Redis for session management and real-time data
- **Architecture**: RESTful API + WebSocket events

## 🚀 Features (In Development)

- **Character System**: Multiple character classes with unique sprites
- **World Exploration**: Tile-based maps with collision detection
- **Real-time Multiplayer**: Live player movement and interactions
- **User Management**: Player authentication and character persistence
- **Responsive UI**: Modal-based interface for game interactions

## 🛠️ Tech Stack

| Component   | Technology                      |
| ----------- | ------------------------------- |
| Frontend    | Svelte, TypeScript, Phaser.js   |
| Backend     | Node.js, Express.js, TypeScript |
| Real-time   | WebSockets (ws library)         |
| Database    | Redis                           |
| Build Tools | Vite, TSC                       |
| Development | Hot Module Replacement (HMR)    |

## 📁 Project Structure

```
Gather_u/
├── client/                 # Frontend Svelte application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/           # Shared utilities and components
│   │   ├── scripts/       # Game logic and Phaser scenes
│   │   └── assets/        # Static assets
│   ├── public/            # Public static files
│   ├── assets/            # Game assets (sprites, maps, etc.)
│   ├── package.json
│   ├── vite.config.js
│   └── svelte.config.js
└── server/                # Backend Node.js application
    ├── src/
    │   ├── models/        # Data models
    │   ├── types/         # TypeScript type definitions
    │   ├── routes/        # API routes
    │   └── res/           # Server resources
    ├── package.json
    └── tsconfig.json
```

## 🎨 Assets

The game uses Creative Commons licensed 16x16 pixel art sprites for characters, providing a nostalgic retro gaming experience. Map tiles and UI elements follow the same aesthetic.

## 🔧 Development Status

This project is currently in active development. Core systems being implemented include:

- ✅ Basic client-server communication
- ✅ Character sprite rendering
- ✅ WebSocket connection handling
- 🔄 Player movement and physics
- 🔄 World persistence
- 🔄 User authentication
- ⏳ Combat system
- ⏳ Inventory management
- ⏳ Chat system

## 🚦 Getting Started

_Documentation for setup and development will be added as the project progresses._

## 📄 License

This project uses various assets under Creative Commons licenses. See individual asset directories for specific licensing information.

---

_This project is a work in progress. Features and documentation will be updated as development continues._
