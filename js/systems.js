import { getActions } from "./input.js";
import { state } from "./game-state.js";
import { applyMovement } from "./physics.js";

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

    applyMovement(entity, world, moveX, moveY, isSprinting, dt);

    if (entity.burstTimer > 0) entity.burstTimer -= dt;
    if (entity.burstCooldown > 0) entity.burstCooldown -= dt;
  });
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
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
          let hasTag = false;

          // Lag Compensation check
          if (chaser.lastTick && world.history) {
              const hist = world.history.find(h => h.tick === chaser.lastTick);
              if (hist) {
                  const hTarget = hist.entities.find(e => e.id === target.id);
                  const hChaser = hist.entities.find(e => e.id === chaser.id);
                  if (hTarget && hChaser && dist(hTarget, hChaser) < hTarget.radius + hChaser.radius) {
                      hasTag = true;
                  }
              }
          }

          // Fallback to current state
          if (!hasTag && dist(target, chaser) < target.radius + chaser.radius) {
            hasTag = true;
          }

          if (hasTag) {
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

  // Tag feedback
  if (reason.includes("caught") || reason.includes("fainted") || reason.includes("defeated")) {
      state.world.entities.forEach(e => {
          if (e.role === "mario" || e.role === "ghost") e.hitTimer = 1.0;
      });
  }
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
