import { state } from "./game-state.js";

let frameCount = 0;
let fps = 0;
let lastTime = performance.now();

export function updateDebugMetrics() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = now;
  }
}

export function drawDebugHUD(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(10, 200, 220, 120);

  ctx.fillStyle = "#00ff00";
  ctx.font = "14px monospace";

  let y = 220;
  ctx.fillText(`FPS: ${fps}`, 20, y); y += 15;
  ctx.fillText(`Tick: ${state.tick}`, 20, y); y += 15;
  ctx.fillText(`Phase: ${state.currentPhase}`, 20, y); y += 15;
  ctx.fillText(`Entities: ${state.world.entities.length}`, 20, y); y += 15;

  const player = state.world.entities.find(e => e.id === state.playerId);
  if (player) {
    ctx.fillText(`Role: ${player.role}`, 20, y); y += 15;
    ctx.fillText(`Pos: ${Math.round(player.x)}, ${Math.round(player.y)}`, 20, y); y += 15;
  }

  ctx.restore();
}
