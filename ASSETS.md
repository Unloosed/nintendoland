# Asset Pipeline Conventions

## Directory Structure

- `assets/images/`: Textures, sprites, and UI elements.
- `assets/audio/`: Sound effects and music tracks.
- `assets/models/`: (Future) 3D model data.

## Import/Export Rules

1. All assets must be referenced via `js/assets.js`.
2. Image assets should be in WebP or PNG format.
3. Audio assets should be in MP3 or OGG format.
4. Assets are loaded asynchronously during the `BOOT` phase.
