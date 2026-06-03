# Nintendo Land Reimagined

This project is a modular, ECS-based implementation of two popular Nintendo Land attractions: **Mario Chase** and **Luigi's Ghost Mansion**.

## Features

- **ECS Architecture**: Core game logic is decoupled into Entities, Components, and Systems for maximum flexibility.
- **Mario Chase**:
  - Mario is faster (speed 172) than the Toad Chasers (speed 158).
  - Symmetrical maps with obstacles.
- **Luigi's Ghost Mansion**:
  - Maze-like corridor maps.
  - Flashlight battery management (drains with use, refilled by power-ups).
  - Teammate reviving: Shine your light on a fainted hunter for 15 seconds.
  - Super Battery: 10-second buff granting increased range, damage, speed, and zero power consumption.
  - Proximity Danger Indicator: Pulsing red circle that intensifies as the Ghost approaches.
- **AI**: Coordinated AI for Chasers and Ghost Hunters.
- **Responsive UI**: Interactive HUD and menu for mode/role selection.

## How to Play

### Local Setup

To bypass browser CORS restrictions for ES modules, you must serve the project via an HTTP server.

1. **Start the server**:

   ```bash
   npm start
   ```

   _Alternatively, run:_ `python -m http.server 8000`

2. **Open the game**:
   Navigate to [http://localhost:8000](http://localhost:8000) in your web browser.

### Controls

- **WASD**: Move
- **Space**: Toggle Flashlight (Hunters) / Primary Ability
- **M**: Toggle Minimap
- **R**: Restart Round

## Project Structure

- `index.html`: Main entry point and UI structure.
- `js/main.js`: Game loop and system orchestration.
- `js/game-state.js`: Central world state and entity creation.
- `js/systems.js`: Core game logic (movement, battery, interactions, objectives).
- `js/render.js`: Canvas-based rendering engine.
- `js/ai.js`: AI behavior logic.
- `js/levels.js`: Symmetrical and maze map definitions.
- `js/ui.js`: HUD and menu management.
- `js/input.js`: Keyboard input handling.
- `js/app.js`: Game mode initialization.
