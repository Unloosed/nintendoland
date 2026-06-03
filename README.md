# Nintendo Land Reimagined

This project is a modular, ECS-based implementation of two popular Nintendo Land attractions: **Mario Chase** and **Luigi's Ghost Mansion**.

## Milestone 0: Project Foundation

This repository has been stabilized with a shared runtime supporting separate phases:
- **FRONTEND**: Main menu and mode/role selection.
- **LOBBY**: Interactive party room to prepare for the match.
- **MATCH**: The active attraction gameplay.
- **RESULTS**: Match outcome and replay/rematch options.

### Features

- **ECS Architecture**: Logic decoupled into Entities, Components, and Systems.
- **Separate Worlds**: State is partitioned by phase to prevent "bleeding" between menus and matches.
- **Debug HUD**: Real-time monitoring of FPS, tick rate, and world state.
- **Asset Pipeline**: Established conventions for managing game resources.

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
- **Shift**: Sprint (or Burst Dash for Mario)
- **Space**: Primary Ability (Flashlight for Hunters)
- **M**: Toggle Minimap
- **V**: Toggle Visibility Debug
- **R**: Restart Round

## Project Structure

- `index.html`: Main entry point and UI structure.
- `js/main.js`: Game loop and system orchestration.
- `js/game-state.js`: Central state and world management.
- `js/app.js`: Phase-specific world initialization (Lobby, Match).
- `js/ui.js`: HUD and phase transitions.
- `js/render.js`: Rendering engine.
- `js/debug.js`: Debug HUD metrics and rendering.
- `js/assets.js`: Centralized asset management.
- `ASSETS.md`: Asset pipeline documentation.
