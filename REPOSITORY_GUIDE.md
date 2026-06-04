# Repository Guide: Nintendo Land Reimagined

Welcome to the technical guide for the **Nintendo Land Reimagined** project. This document provides a detailed overview of the repository structure, the core architecture, and the purpose of each individual file.

## Project Overview

This project is a modular, high-fidelity reimagining of classic Nintendo Land attractions, specifically **Mario Chase** and **Luigi's Ghost Mansion**. It is built using a modern **Entity Component System (ECS)** architecture and designed with server-authoritative multiplayer principles in mind.

## Core Architecture: ECS

The game is organized into three main pillars:
1.  **Entities**: Simple objects with a unique ID and a collection of properties (components).
2.  **Components**: Data stored on entities (e.g., `x`, `y`, `vx`, `vy`, `radius`, `role`).
3.  **Systems**: Logic that processes groups of entities with specific components (e.g., `movementSystem`, `visibilitySystem`).

State is managed centrally and partitioned into "Worlds" based on the current game phase (Lobby, Match, etc.) to ensure clean state transitions and prevent logic "bleeding."

## Repository Structure

### Root Directory
- `index.html`: The entry point for the web application. It defines the HUD layout and the canvas where the game is rendered.
- `package.json`: Contains project metadata and scripts (e.g., `npm start` to run the local server).
- `README.md`: High-level project introduction, features, and setup instructions.
- `REPOSITORY_GUIDE.md`: (This file) In-depth technical documentation.
- `ASSETS.md`: Documentation for the asset pipeline and resource management.
- `nintendoland_system_architecture_ecs_networking.md`: Detailed technical specification for the game's architecture and networking model.

### `js/` (Source Code)
The `js/` directory contains the modular JavaScript files that power the game engine.

- `main.js`: The heart of the application. It orchestrates the game loop, initializes the engine, and executes systems every frame.
- `game-state.js`: Defines the central `state` object, manages phase transitions, and provides helpers for entity creation and world management.
- `app.js`: Handles high-level application logic, including the initialization of specific game modes (Mario Chase, Ghost Mansion) and the Lobby.
- `systems.js`: Contains all the ECS systems (Movement, Battery, Visibility, Interaction, Objectives, Scoring) that drive gameplay logic.
- `render.js`: The rendering engine. It handles canvas drawing, character animations (squash and stretch), shadows, and HUD updates.
- `levels.js`: A data-driven repository of map definitions, including blockers (obstacles), terrain (mud, slopes), and spawn points.
- `utils.js`: Shared utility functions for math, collision detection, and finding safe spawn positions.
- `input.js`: A unified input abstraction layer that maps keyboard and gamepad inputs to game actions.
- `visibility.js`: Implements the asymmetric information system (e.g., Mario's top-down view vs. Toads' limited visibility).
- `camera.js`: Manages different camera rigs (Chase, Top-down) tailored to specific roles.
- `ai.js`: Contains the logic for CPU-controlled entities (Yoshi Carts, AI chasers/trackers).
- `network.js`: The authoritative networking layer (simulated in local mode) handling synchronization and lag compensation.
- `assets.js`: Manages the loading and retrieval of game assets (images, sounds).
- `debug.js`: Provides the real-time Debug HUD metrics.

### `implementation_docs/`
Contains detailed design documents for specific attractions:
- `mario-run.md`: Design and implementation details for Mario Chase.
- `luigis-ghost-mansion.md`: Design and implementation details for Luigi's Ghost Mansion.

## Contributing

When adding new features or attractions:
1.  **Define Components**: Determine what data your new entities need.
2.  **Implement Systems**: Create modular functions in `systems.js` to handle the logic.
3.  **Data-Drive Levels**: Add new map configurations to `levels.js`.
4.  **Update UI**: Modify `index.html` and `ui.js` for new HUD requirements.
