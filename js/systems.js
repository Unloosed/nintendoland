import { getActions } from "./input.js";
import { state } from "./game-state.js";

export function movementSystem(world, dt) {
  world.entities.forEach((entity) => {
    if (!entity.alive) return;

    // Track input history for prediction/reconciliation (Client only)
    if (entity.id === state.playerId) {
        if (!entity.inputHistory) entity.inputHistory = [];
        const actions = getActions();
        entity.inputHistory.push({
            tick: state.tick,
            actions: { ...actions },
            startPos: { x: entity.x, y: entity.y },
            startVel: { vx: entity.vx, vy: entity.vy }
        });
        // Limit history size
        if (entity.inputHistory.length > 100) entity.inputHistory.shift();
    }

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

  if (state.mode === "mario_chase") {
    if (entity.role === "mario") {
      config.maxSpeed = 172;
      config.acceleration = 12;
      if (entity.burstTimer > 0) config.maxSpeed *= 1.5;
    } else {
      config.maxSpeed = 158;
      config.acceleration = 10;
    }
  } else if (state.mode === "ghost_mansion") {
    if (entity.role === "ghost") {
      config.maxSpeed = 165;
    } else if (entity.role === "tracker") {
      config.maxSpeed = 155;
      if (entity.battery <= 0) config.maxSpeed *= 0.5;
      if (entity.flashlightActive) config.maxSpeed *= 0.85;
      if (entity.fainted) config.maxSpeed = 0;
      if (entity.superBatteryTimer > 0) config.maxSpeed *= 1.2;
    }
  }

  return config;
}

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, t);
}

function lerpAngle(a, b, t) {
  const d = normalizeAngle(b - a);
  return a + d * Math.min(1, t);
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function checkCollision(world, x, y, radius) {
  return world.map.blockers.some(
    (b) =>
      x + radius > b.x &&
      x - radius < b.x + b.w &&
      y + radius > b.y &&
      y - radius < b.y + b.h,
  );
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
    chasers.forEach(chaser => {
      const d = dist(chaser, mario);
      chaser.marioDistance = d;

      // Reveal Mario if very close
      if (d < 150) {
        mario.revealTimer = 0.5;
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
      const collectors = world.entities.filter(e => e.role === "tracker" || e.role === "chaser" || e.role === "mario");
      collectors.forEach((collector) => {
        if (!collector.fainted && dist(collector, pu) < collector.radius + pu.radius) {
          if (pu.kind === "battery") {
            collector.battery = 100;
          } else if (pu.kind === "super_battery") {
            collector.battery = 100;
            collector.superBatteryTimer = 10;
          }
          pu.alive = false;
        }
      });
    });

  world.entities = world.entities.filter((e) => e.alive !== false);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function objectiveSystem(world, dt) {
  if (!state.running || !world.objectives) return;

  state.timeLeft = Math.max(0, state.timeLeft - dt * 1000);

  const currentObj = world.objectives[world.currentObjectiveIndex];
  if (!currentObj) return;

  if (currentObj.type === "composite") {
    currentObj.subObjectives.forEach(sub => {
      checkObjective(sub, world);
    });
  } else {
    checkObjective(currentObj, world);
  }
}

function checkObjective(obj, world) {
  if (!state.running) return;

  switch (obj.type) {
    case "timer_expire":
      if (state.timeLeft <= 0) {
        finishMatch(obj.winRole, obj.reason);
      }
      break;

    case "proximity_tag":
      const target = world.entities.find(e => e.role === obj.targetRole);
      const chasers = world.entities.filter(e => e.role === obj.chaserRole);
      if (target) {
        chasers.forEach(chaser => {
          if (dist(target, chaser) < target.radius + chaser.radius) {
            finishMatch(obj.winRole, obj.reason);
          }
        });
      }
      break;

    case "entity_stat_zero":
      const ent = world.entities.find(e => e.role === obj.role);
      if (ent && (ent[obj.stat] || 0) <= 0) {
        finishMatch(obj.winRole, obj.reason);
      }
      break;

    case "all_fainted":
      const entities = world.entities.filter(e => e.role === obj.role);
      if (entities.length > 0 && entities.every(e => e.fainted)) {
        finishMatch(obj.winRole, obj.reason);
      }
      break;
  }
}

function finishMatch(winRole, reason) {
  state.running = false;
  state.result = {
    success: state.role === winRole,
    reason: reason
  };
}

export function scoringSystem(world) {
  const player = world.entities.find((e) => e.id === state.playerId);
  if (player) {
    if (state.mode === "mario_chase") {
      player.score = Math.floor((20000 - state.timeLeft) / 100);
    } else {
      player.score =
        player.role === "ghost"
          ? Math.floor((18000 - state.timeLeft) / 100)
          : Math.floor(100 - (world.entities.find((e) => e.role === "ghost")?.energy || 0));
    }
  }
}
