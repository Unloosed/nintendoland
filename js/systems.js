import { getActions } from "./input.js";
import { state, createEntity } from "./game-state.js";
import { checkCollision, dist, lerp, lerpAngle, normalizeAngle, getZoneName } from "./utils.js";

export function movementSystem(world, dt) {
  world.entities.forEach((entity) => {
    if (!entity.alive) return;
    if (state.mode === "mario_chase" && state.marioHeadStart > 0 && entity.role !== "mario") return;

    let moveX = 0;
    let moveY = 0;
    let isSprinting = false;

    if (entity.id === state.playerId) {
      const actions = getActions();
      moveX = actions.moveX;
      moveY = actions.moveY;
      isSprinting = actions.sprint;

      if (state.mode === "mario_chase" && entity.role === "mario") {
        if (actions.primary && (entity.burstCooldown || 0) <= 0) {
          entity.burstTimer = 0.5;
          entity.burstCooldown = 5;
        }
      }

      if (state.mode === "ghost_mansion" && entity.role === "tracker") {
        entity.flashlightActive = actions.primary && entity.battery > 0;
      }
    } else if (entity.ai) {
      moveX = entity.intent?.x || 0;
      moveY = entity.intent?.y || 0;
      isSprinting = entity.intent?.sprint || false;
    }

    // --- Movement Physics (Acceleration/Friction) ---
    const config = getMovementConfig(entity);

    // Desired velocity
    const targetVx = moveX * config.maxSpeed * (isSprinting ? 1.3 : 1.0);
    const targetVy = moveY * config.maxSpeed * (isSprinting ? 1.3 : 1.0);

    // Acceleration
    const accel = (moveX !== 0 || moveY !== 0) ? config.acceleration : config.friction;

    entity.vx = lerp(entity.vx, targetVx, accel * dt);
    entity.vy = lerp(entity.vy, targetVy, accel * dt);

    // Rotation / Facing
    if (Math.hypot(entity.vx, entity.vy) > 10) {
      const targetAngle = Math.atan2(entity.vy, entity.vx);
      entity.facing = lerpAngle(entity.facing || 0, targetAngle, config.turnRate * dt);
      entity.animState = isSprinting ? "run" : "walk";
    } else {
      entity.animState = "idle";
    }

    // Collision & Integration
    const nextX = entity.x + entity.vx * dt;
    const nextY = entity.y + entity.vy * dt;

    if (!checkCollision(world, nextX, entity.y, entity.radius)) {
      entity.x = nextX;
    } else {
      entity.vx = 0;
    }

    if (!checkCollision(world, entity.x, nextY, entity.radius)) {
      entity.y = nextY;
    } else {
      entity.vy = 0;
    }

    // Keep in bounds
    entity.x = Math.max(entity.radius, Math.min(world.map.width - entity.radius, entity.x));
    entity.y = Math.max(entity.radius, Math.min(world.map.height - entity.radius, entity.y));

    if (entity.burstTimer > 0) entity.burstTimer -= dt;
    if (entity.burstCooldown > 0) entity.burstCooldown -= dt;
  });
}

function getMovementConfig(entity) {
  let config = {
    maxSpeed: 150,
    acceleration: 8,
    friction: 10,
    turnRate: 10
  };

  // Terrain modifiers
  const map = state.world.map;
  if (state.mode === "mario_chase") {
    // Mud slowdown
    const onIntactBridge = (map.bridges || []).some(b =>
      b.state !== "destroyed" &&
      entity.x > b.x && entity.x < b.x + b.w &&
      entity.y > b.y && entity.y < b.y + b.h
    );

    const inMud = (map.mud || []).some(m =>
      entity.x > m.x && entity.x < m.x + m.w &&
      entity.y > m.y && entity.y < m.y + m.h
    );

    if (inMud && !onIntactBridge && (entity.superStarTimer || 0) <= 0) {
      config.maxSpeed *= 0.5;
    }

    // Slopes
    (map.slopes || []).forEach(s => {
      if (entity.x > s.x && entity.x < s.x + s.w &&
          entity.y > s.y && entity.y < s.y + s.h) {
        // Simple slope effect: if moving with slope dir, speed up. if against, slow down.
        const speed = Math.hypot(entity.vx, entity.vy);
        if (speed > 10) {
          const dot = (entity.vx / speed) * s.dirX + (entity.vy / speed) * s.dirY;
          config.maxSpeed *= (1 + dot * 0.3);
        }
      }
    });
  }

  if (state.mode === "mario_chase") {
    if (entity.role === "mario") {
      config.maxSpeed = 158;
      config.acceleration = 12;
      if (entity.superStarTimer > 0) config.maxSpeed *= 1.4;
      if (entity.burstTimer > 0) config.maxSpeed *= 1.5;
      if (entity.stunTimer > 0) config.maxSpeed *= 0.3;
    } else {
      config.maxSpeed = 172;
      config.acceleration = 10;
      if (entity.stunTimer > 0) config.maxSpeed = 0;
    }
  } else if (state.mode === "ghost_mansion") {
    if (entity.role === "tracker") {
      config.maxSpeed = 155;
      if (entity.battery <= 0) config.maxSpeed *= 0.5;
      if (entity.flashlightActive) config.maxSpeed *= 0.85;
      if (entity.fainted) config.maxSpeed = 0;
      if (entity.superBatteryTimer > 0) config.maxSpeed *= 1.2;
    }
  }

  return config;
}

export function batterySystem(world, dt) {
  world.entities.forEach((entity) => {
    if (state.mode === "ghost_mansion" && entity.role === "tracker") {
      if (entity.superBatteryTimer > 0) {
        entity.superBatteryTimer -= dt;
      }

      if (entity.flashlightActive) {
        if (entity.superBatteryTimer <= 0) {
          entity.battery = Math.max(0, entity.battery - dt * 15);
        }
      }

      if (entity.battery <= 0) {
        entity.flashlightActive = false;
      }
    }
  });
}

export function visibilitySystem(world, dt) {
  const mario = world.entities.find(e => e.role === "mario");
  const ghost = world.entities.find((e) => e.role === "ghost");

  if (state.mode === "mario_chase" && mario) {
    const chasers = world.entities.filter(e => e.role === "chaser");
    const yoshis = world.entities.filter(e => e.role === "yoshi_cart");

    chasers.forEach(chaser => {
      const d = dist(chaser, mario);
      chaser.marioDistance = d;

      // Reveal Mario if very close
      if (d < 150) {
        mario.revealTimer = 0.5;
      }
    });

    state.marioZoneHint = null;
    yoshis.forEach(yoshi => {
      if (dist(yoshi, mario) < 300) {
        state.marioZoneHint = `Mario spotted in ${getZoneName(mario.x, mario.y)} zone!`;
      }
    });
  }

  if (state.mode === "ghost_mansion" && ghost) {
    world.entities.forEach((entity) => {
      if (entity.role === "tracker") {
        const d = dist(entity, ghost);

        entity.dangerLevel = 0;
        if (d < 400) {
          entity.dangerLevel = (400 - d) / 400;
        }

        if (entity.flashlightActive && !entity.fainted) {
          const dx = ghost.x - entity.x;
          const dy = ghost.y - entity.y;
          const angle = Math.atan2(dy, dx);
          const facing = entity.facing || 0;
          const diff = Math.abs(normalizeAngle(angle - facing));

          const range = entity.superBatteryTimer > 0 ? 350 : 200;

          if (d < range && diff < 0.5) {
            ghost.revealTimer = 0.5;
            const damageMult = entity.superBatteryTimer > 0 ? 3 : 1;
            ghost.energy = Math.max(0, ghost.energy - dt * 20 * damageMult);
          }
        }
      }
    });
  }

  world.entities.forEach(e => {
    if (e.revealTimer > 0) e.revealTimer -= dt;
  });
}

export function interactionSystem(world, dt) {
  // Bridge Update Logic
  (state.world.map.bridges || []).forEach(b => {
    if (b.state === "collapsing") {
      b.collapseTimer = (b.collapseTimer || 2.0) - dt;
      if (b.collapseTimer <= 0) {
        b.state = "destroyed";
      }
    } else if (b.state === "intact") {
       // Check if Mario is on the bridge
       const mario = world.entities.find(e => e.role === "mario");
       if (mario &&
           mario.x > b.x && mario.x < b.x + b.w &&
           mario.y > b.y && mario.y < b.y + b.h) {
         b.state = "collapsing";
         b.collapseTimer = 2.0;
       }
    }
  });

  const mario = world.entities.find((e) => e.role === "mario");
  const yoshis = world.entities.filter((e) => e.role === "yoshi_cart");
  const chasers = world.entities.filter((e) => e.role === "chaser");

  if (state.mode === "mario_chase" && mario) {
    if (mario.superStarTimer > 0) {
      mario.superStarTimer -= dt;
      // Knockback chasers and yoshis
      [...chasers, ...yoshis].forEach(other => {
        if (dist(mario, other) < mario.radius + other.radius + 10) {
          const dx = other.x - mario.x;
          const dy = other.y - mario.y;
          const angle = Math.atan2(dy, dx);
          other.vx = Math.cos(angle) * 400;
          other.vy = Math.sin(angle) * 400;
          other.stunTimer = 1.0;
        }
      });
    }

    yoshis.forEach((yoshi) => {
      if (dist(mario, yoshi) < mario.radius + yoshi.radius) {
        if (mario.superStarTimer > 0) return;
        mario.stunTimer = 1.5; // Stun Mario for 1.5s
      }
    });

    if (mario.stunTimer > 0) mario.stunTimer -= dt;
  }

  const ghost = world.entities.find((e) => e.role === "ghost");
  const trackers = world.entities.filter((e) => e.role === "tracker");

  if (state.mode === "ghost_mansion" && ghost) {
    trackers.forEach((tracker) => {
      if (!tracker.fainted) {
        const d = dist(tracker, ghost);
        if (d < tracker.radius + ghost.radius) {
          tracker.fainted = true;
          tracker.reviveProgress = 0;
        }
      } else {
        let beingRevived = false;
        trackers.forEach((other) => {
          if (other !== tracker && other.flashlightActive && !other.fainted) {
            const dx = tracker.x - other.x;
            const dy = tracker.y - other.y;
            const angle = Math.atan2(dy, dx);
            const facing = other.facing || 0;
            const diff = Math.abs(normalizeAngle(angle - facing));
            const d = dist(other, tracker);

            if (d < 200 && diff < 0.5) {
              beingRevived = true;
              const reviveMult = other.superBatteryTimer > 0 ? 2 : 1;
              tracker.reviveProgress += dt * reviveMult;
            }
          }
        });

        if (tracker.reviveProgress >= 15) {
          tracker.fainted = false;
          tracker.reviveProgress = 0;
          tracker.battery = Math.max(tracker.battery, 30);
        }
      }
    });
  }

  world.entities
    .filter((e) => e.type === "powerup")
    .forEach((pu) => {
      // Handle delayed powerups (Super Star in Mario Chase)
      if (pu.delayed) {
        if ((120000 - state.timeLeft) < 30000) {
          return; // Not yet spawned
        }
        pu.delayed = false; // Spawn it
      }

      const collectors = world.entities.filter(e => e.role === "tracker" || e.role === "chaser" || e.role === "mario");
      collectors.forEach((collector) => {
        if (!collector.fainted && dist(collector, pu) < collector.radius + pu.radius) {
          if (pu.kind === "battery") {
            collector.battery = 100;
          } else if (pu.kind === "super_battery") {
            collector.battery = 100;
            collector.superBatteryTimer = 10;
          } else if (pu.kind === "super_star") {
            collector.superStarTimer = 15; // 15 seconds of power
          }
          pu.alive = false;
        }
      });
    });

  world.entities = world.entities.filter((e) => e.alive !== false);
}

export function objectiveSystem(world, dt) {
  if (!state.running) return;

  if (state.mode === "mario_chase" && state.marioHeadStart > 0) {
    state.marioHeadStart = Math.max(0, state.marioHeadStart - dt);
    return;
  }

  state.timeLeft = Math.max(0, state.timeLeft - dt * 1000);

  if (state.mode === "mario_chase") {
    const mario = world.entities.find((e) => e.role === "mario");
    const chasers = world.entities.filter((e) => e.role === "chaser");

    if (mario) {
      chasers.forEach((chaser) => {
        if (dist(mario, chaser) < mario.radius + chaser.radius) {
          if (mario.superStarTimer > 0) return;
          state.running = false;
          state.result = {
            success: state.role === "chaser",
            reason: "Mario was caught!",
          };
        }
      });
    }

    if (state.timeLeft <= 0) {
      state.running = false;
      state.result = {
        success: state.role === "mario",
        reason: "Mario escaped!",
      };
    }
  } else if (state.mode === "ghost_mansion") {
    const ghost = world.entities.find((e) => e.role === "ghost");
    const trackers = world.entities.filter((e) => e.role === "tracker");

    if (ghost && ghost.energy <= 0) {
      state.running = false;
      state.result = {
        success: state.role === "tracker",
        reason: "Ghost was defeated!",
      };
    }

    if (trackers.length > 0 && trackers.every((t) => t.fainted)) {
      state.running = false;
      state.result = {
        success: state.role === "ghost",
        reason: "All hunters fainted!",
      };
    }

    if (state.timeLeft <= 0) {
      state.running = false;
      state.result = {
        success: state.role === "ghost",
        reason: "Time expired!",
      };
    }
  }
}

export function scoringSystem(world) {
  const player = world.entities.find((e) => e.id === state.playerId);
  if (player) {
    if (state.mode === "mario_chase") {
      player.score = Math.floor((120000 - state.timeLeft) / 100);
    } else {
      player.score =
        player.role === "ghost"
          ? Math.floor((18000 - state.timeLeft) / 100)
          : Math.floor(100 - (world.entities.find((e) => e.role === "ghost")?.energy || 0));
    }
  }
}
