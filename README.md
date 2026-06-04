# Nintendo Land Reimagined

This project is a modular, ECS-based implementation of two popular Nintendo Land attractions: **Mario Chase** and **Luigi's Ghost Mansion**.

## Quick Links
- [**Technical Repository Guide**](./REPOSITORY_GUIDE.md) - Start here for code overview and architecture.
- [**System Architecture & Networking**](./nintendoland_system_architecture_ecs_networking.md) - Detailed technical specs.
- [**Asset Pipeline**](./ASSETS.md) - How assets are managed.

## Milestone 0: Project Foundation

This repository has been stabilized with a shared runtime supporting separate phases:
- **FRONTEND**: Main menu and mode/role selection.
- **LOBBY**: Interactive party room to prepare for the match.
- **MATCH**: The active attraction gameplay.
- **RESULTS**: Match outcome and replay/rematch options.

### Features

- **ECS Architecture**: Logic decoupled into Entities, Components, and Systems.
- **Data-Driven Levels**: Maps and spawns defined in JSON-like structures.
- **Asymmetric Gameplay**: Different roles have unique views and abilities.
- **Authoritative Simulation**: Centralized logic for movement, collision, and objectives.
- **Debug HUD**: Real-time monitoring of FPS, tick rate, and world state.

## How to Play Locally

To bypass browser CORS restrictions for ES modules, you must serve the project via an HTTP server.

1. **Start the server**:

   ```bash
   npm start
   ```

   _Alternatively, run:_ `python3 -m http.server 8000`

2. **Open the game**:
   Navigate to [http://localhost:8000](http://localhost:8000) in your web browser.

## Controls

- **WASD**: Move
- **Shift**: Sprint
- **Space**: Primary Ability (Flashlight for Hunters / Burst for Mario)
- **M**: Toggle Minimap
- **R**: Restart Round
