import { state } from "./game-state.js";

/**
 * Computes what a given entity (usually the player) is allowed to know about other entities.
 */
export function filterWorldForRole(world, observerId) {
  const observer = world.entities.find(e => e.id === observerId);
  if (!observer) return world.entities;

  return world.entities.map(entity => {
    // Clone entity to avoid mutating original world state
    const filtered = { ...entity };

    if (state.mode === "mario_chase") {
      if (observer.role === "chaser") {
        if (entity.role === "mario") {
          if (!entity.revealTimer && dist(observer, entity) > 300) {
            // Hide precise position if too far and not revealed
            delete filtered.x;
            delete filtered.y;
            filtered.hidden = true;
          }
        }
      } else if (observer.role === "mario") {
        // Mario sees everything!
      }
    } else if (state.mode === "ghost_mansion") {
      if (observer.role === "tracker" && entity.role === "ghost") {
        if (!entity.revealTimer) {
          delete filtered.x;
          delete filtered.y;
          filtered.hidden = true;
        }
      }
    }

    return filtered;
  });
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
