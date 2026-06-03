import { state, Phases } from "./game-state.js";
import { updateDebugMetrics, drawDebugHUD } from "./debug.js";
import { Camera, applyCamera, updateCamera } from "./camera.js";
import { filterWorldForRole } from "./visibility.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas?.getContext("2d");

export function render() {
  if (!ctx) return;

  updateDebugMetrics();

  const { width, height } = canvas;
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Stylized Background with Depth
  const grad = ctx.createRadialGradient(width/2, height/2, 100, width/2, height/2, width);
  grad.addColorStop(0, "#1a2a3a");
  grad.addColorStop(1, "#080c10");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (state.currentPhase === Phases.LOBBY || state.currentPhase === Phases.MATCH) {
    applyCamera(ctx, canvas);
  }

  drawGrid(width, height);
  drawBlockers(state.world.map.blockers);

  const visibleEntities = filterWorldForRole(state.world, state.playerId);

  visibleEntities.forEach((entity) => {
    if (!entity.hidden) {
      drawEntity(entity);
    } else if (entity.lastSeenX !== undefined) {
      drawLastSeenMarker(entity);
    }
  });

  if (state.ui.debugVisibility) {
    drawVisibilityDebug();
  }

  ctx.restore();

  if (state.ui.showMinimap) {
    drawMinimap(visibleEntities);
  }

  drawDebugHUD(ctx);
  drawDistanceHints();
}

function drawGrid(w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(48, 213, 200, 0.08)";
  ctx.lineWidth = 1;
  for (let x = -2000; x < 3000; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, -2000);
    ctx.lineTo(x, 2000);
    ctx.stroke();
  }
  for (let y = -2000; y < 2000; y += 80) {
    ctx.beginPath();
    ctx.moveTo(-2000, y);
    ctx.lineTo(3000, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlockers(blockers) {
  blockers.forEach((b) => {
    // 3D-like box effect
    const depth = 20;
    ctx.fillStyle = "rgba(40, 60, 80, 0.6)";
    ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h); // Shadow

    ctx.fillStyle = "#2c3e50";
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 2;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // Top face highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(b.x, b.y, b.w, 10);
  });
}

function drawLastSeenMarker(entity) {
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = entity.color;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);

  ctx.beginPath();
  ctx.arc(entity.lastSeenX, entity.lastSeenY, entity.radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw "?" icon
  ctx.fillStyle = "white";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("?", entity.lastSeenX, entity.lastSeenY + 4);

  ctx.restore();
}

function drawEntity(entity) {
  if (entity.flashlightActive) {
    drawFlashlight(entity);
  }

  ctx.save();

  // Entity Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(entity.x, entity.y + entity.radius * 0.8, entity.radius, entity.radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // "3D" Character Body
  const baseColor = entity.color;
  const gradient = ctx.createRadialGradient(
    entity.x - entity.radius * 0.3,
    entity.y - entity.radius * 0.3,
    entity.radius * 0.1,
    entity.x,
    entity.y,
    entity.radius
  );
  gradient.addColorStop(0, "white");
  gradient.addColorStop(0.2, baseColor);
  gradient.addColorStop(1, darkenColor(baseColor, 40));

  ctx.fillStyle = gradient;
  if (entity.fainted) ctx.globalAlpha = 0.4;

  // Squish animation based on movement
  let sx = 1, sy = 1;
  if (entity.animState === "run") {
    sx = 1 + Math.sin(state.tick * 0.2) * 0.1;
    sy = 1 - Math.sin(state.tick * 0.2) * 0.1;
  }

  // Hit/Tag feedback
  if (entity.hitTimer > 0) {
      sx *= 1.4;
      sy *= 0.6;
      ctx.fillStyle = "white";
  }

  ctx.beginPath();
  ctx.ellipse(entity.x, entity.y, entity.radius * sx, entity.radius * sy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (Directional)
  if (entity.facing !== undefined) {
    const eyeDist = entity.radius * 0.5;
    const eyeSize = entity.radius * 0.2;
    const angle = entity.facing;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(entity.x + Math.cos(angle - 0.4) * eyeDist, entity.y + Math.sin(angle - 0.4) * eyeDist, eyeSize, 0, Math.PI * 2);
    ctx.arc(entity.x + Math.cos(angle + 0.4) * eyeDist, entity.y + Math.sin(angle + 0.4) * eyeDist, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(entity.x + Math.cos(angle - 0.4) * eyeDist * 1.2, entity.y + Math.sin(angle - 0.4) * eyeDist * 1.2, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.arc(entity.x + Math.cos(angle + 0.4) * eyeDist * 1.2, entity.y + Math.sin(angle + 0.4) * eyeDist * 1.2, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (entity.id === state.playerId) {
    ctx.strokeStyle = "#30d5c8";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
  }

  ctx.restore();
  drawSpecializedUI(entity);

  if (entity.hitTimer > 0) entity.hitTimer -= 0.03; // Simple decay
}

function darkenColor(hex, percent) {
  // Simple hex darken
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r - (r * percent / 100)));
  g = Math.max(0, Math.min(255, g - (g * percent / 100)));
  b = Math.max(0, Math.min(255, b - (b * percent / 100)));
  return `rgb(${r}, ${g}, ${b})`;
}

// ... existing specialized UI, distance hints, flashlight, minimap ...
// (I will keep them as is for now)

function drawSpecializedUI(entity) {
  if (state.mode === "ghost_mansion" && entity.role === "tracker") {
      ctx.save();
      const barW = 30;
      const barH = 4;
      const bx = entity.x - barW / 2;
      const by = entity.y + entity.radius + 12;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = entity.battery > 20 ? "#30d5c8" : "#ff6b88";
      ctx.fillRect(bx, by, barW * (entity.battery / 100), barH);
      ctx.restore();
  }
}

function drawDistanceHints() {
  const player = state.world.entities.find(e => e.id === state.playerId);
  if (state.mode === "mario_chase" && player && player.role === "chaser") {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Orbitron";
    const d = Math.round(player.marioDistance || 0);
    ctx.fillText(`Distance: ${d}m`, canvas.width / 2 - 80, 80);
    ctx.restore();
  }
}

function drawFlashlight(entity) {
  const range = entity.superBatteryTimer > 0 ? 350 : 200;
  const facing = entity.facing || 0;
  ctx.save();
  const grad = ctx.createRadialGradient(entity.x, entity.y, 10, entity.x, entity.y, range);
  grad.addColorStop(0, "rgba(255, 255, 200, 0.4)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(entity.x, entity.y);
  ctx.arc(entity.x, entity.y, range, facing - 0.6, facing + 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawVisibilityDebug() {
  ctx.save();
  // Draw "Real" positions of all entities in wireframe
  state.world.entities.forEach(entity => {
    ctx.strokeStyle = entity.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Line from real to last-seen if hidden
    if (entity.hidden && entity.lastSeenX !== undefined) {
      ctx.beginPath();
      ctx.moveTo(entity.x, entity.y);
      ctx.lineTo(entity.lastSeenX, entity.lastSeenY);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function drawMinimap(visibleEntities) {
  const x = canvas.width - 220, y = 24, w = 190, h = 126;
  ctx.save();
  ctx.fillStyle = "rgba(14, 19, 28, 0.9)";
  ctx.strokeStyle = "rgba(48, 213, 200, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillRect(x, y, w, h);
  const sx = w / state.world.map.width;
  const sy = h / state.world.map.height;
  state.world.map.blockers.forEach((b) => {
    ctx.fillStyle = "rgba(48, 213, 200, 0.1)";
    ctx.fillRect(x + b.x * sx, y + b.y * sy, b.w * sx, b.h * sy);
  });
  visibleEntities.forEach((e) => {
    if (e.hidden) return;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(x + e.x * sx, y + e.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
