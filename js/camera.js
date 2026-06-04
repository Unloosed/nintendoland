import { state } from "./game-state.js";

export const Camera = {
  x: 0,
  y: 0,
  zoom: 1,
  targetX: 0,
  targetY: 0,
  lerpSpeed: 5,
};

export function updateCamera(dt) {
  const player = state.world.entities.find((e) => e.id === state.playerId);
  if (!player) return;

  // Camera profile based on role
  if (player.role === "mario") {
    // Mario sees the whole arena
    Camera.targetX = 640;
    Camera.targetY = 360;
    Camera.zoom = 0.8;
  } else if (player.role === "ghost" || player.role === "lobby_player" || player.role === "chaser") {
    // Third-person chase (follows player closely)
    Camera.targetX = player.x;
    Camera.targetY = player.y;
    Camera.zoom = 1.5;
  } else {
    // Tactical top-down (zoomed out)
    Camera.targetX = player.x;
    Camera.targetY = player.y;
    Camera.zoom = 1.0;
  }

  // Smooth follow
  Camera.x += (Camera.targetX - Camera.x) * Camera.lerpSpeed * dt;
  Camera.y += (Camera.targetY - Camera.y) * Camera.lerpSpeed * dt;
}

export function applyCamera(ctx, canvas) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.translate(cx, cy);
  ctx.scale(Camera.zoom, Camera.zoom);
  ctx.translate(-Camera.x, -Camera.y);
}
