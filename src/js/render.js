import { state } from './game-state.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

export function render() {
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0c1720');
  grad.addColorStop(1, '#10161e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  drawGrid(width, height);
  drawBlockers(state.world.map.blockers);

  state.world.entities.forEach(entity => {
    drawEntity(entity);
  });

  if (state.ui.showMinimap) {
    drawMinimap();
  }
}

function drawGrid(w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawBlockers(blockers) {
  blockers.forEach(b => {
    ctx.fillStyle = 'rgba(125, 144, 164, 0.18)';
    ctx.strokeStyle = 'rgba(173, 196, 212, 0.18)';
    ctx.lineWidth = 2;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  });
}

function drawEntity(entity) {
    // Visibility logic for Ghost Mansion
    if (state.mode === 'ghost_mansion' && entity.role === 'ghost') {
        const player = state.world.entities.find(e => e.id === state.playerId);
        if (player && player.role === 'tracker' && !entity.revealTimer && entity.id !== state.playerId) {
            return; // Invisible to trackers unless revealed
        }
    }

    if (entity.flashlightActive) {
        drawFlashlight(entity);
    }

    ctx.save();

    // Character base
    ctx.fillStyle = entity.color;
    if (entity.fainted) ctx.globalAlpha = 0.5;

    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player indicator
    if (entity.id === state.playerId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();

    drawSpecializedUI(entity);
}

function drawSpecializedUI(entity) {
    if (state.mode === 'ghost_mansion') {
        // Battery bar under hunters
        if (entity.role === 'tracker') {
            ctx.save();
            const barW = 30;
            const barH = 4;
            const bx = entity.x - barW / 2;
            const by = entity.y + entity.radius + 8;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, barW, barH);

            ctx.fillStyle = entity.battery > 20 ? '#30d5c8' : '#ff6b88';
            ctx.fillRect(bx, by, barW * (entity.battery / 100), barH);

            if (entity.superBatteryTimer > 0) {
                ctx.strokeStyle = '#f5c451';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
            }

            // Revive progress
            if (entity.fainted && entity.reviveProgress > 0) {
                ctx.fillStyle = 'white';
                ctx.font = '10px Inter';
                ctx.fillText(`Reviving: ${Math.floor(entity.reviveProgress)}s`, bx, by + 15);
            }
            ctx.restore();
        }

        // Danger indicator
        if (entity.role === 'tracker' && entity.id === state.playerId && entity.dangerLevel > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 107, 136, ${entity.dangerLevel * 0.5})`;
            ctx.lineWidth = 2 + entity.dangerLevel * 4;
            ctx.arc(entity.x, entity.y, entity.radius + 15 + Math.sin(state.tick * 0.1) * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function drawFlashlight(entity) {
    const range = entity.superBatteryTimer > 0 ? 350 : 200;
    const facing = entity.facing || 0;

    ctx.save();
    ctx.fillStyle = entity.superBatteryTimer > 0 ? 'rgba(255, 255, 150, 0.2)' : 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(entity.x, entity.y);
    ctx.arc(entity.x, entity.y, range, facing - 0.5, facing + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawMinimap() {
  const x = canvas.width - 220, y = 24, w = 190, h = 126;
  ctx.save();
  ctx.fillStyle = 'rgba(7,12,18,.74)';
  ctx.strokeStyle = 'rgba(163,196,212,.24)';
  ctx.strokeRect(x, y, w, h);
  ctx.fillRect(x, y, w, h);

  const sx = w / state.world.map.width;
  const sy = h / state.world.map.height;

  state.world.map.blockers.forEach(b => {
    ctx.fillStyle = 'rgba(173,196,212,.15)';
    ctx.fillRect(x + b.x * sx, y + b.y * sy, b.w * sx, b.h * sy);
  });

  state.world.entities.forEach(e => {
      // Minimap visibility
      if (state.mode === 'ghost_mansion' && e.role === 'ghost') {
          const player = state.world.entities.find(p => p.id === state.playerId);
          if (player && player.role === 'tracker' && !e.revealTimer && e.id !== state.playerId) return;
      }

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(x + e.x * sx, y + e.y * sy, 2, 0, Math.PI * 2);
      ctx.fill();
  });
  ctx.restore();
}
