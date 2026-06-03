import { isKeyPressed, getMovementInput } from "./input.js";
import { state } from "./game-state.js";

export function movementSystem(world, dt) {
  world.entities.forEach((entity) => {
    if (!entity.alive) return;

    let moveX = 0;
    let moveY = 0;
    let isSprinting = false;

    if (entity.id === state.playerId) {
      const input = getMovementInput();
      moveX = input.x;
      moveY = input.y;
      if (input.angle !== null) {
        entity.facing = input.angle;
      }
      isSprinting = isKeyPressed("ShiftLeft") || isKeyPressed("ShiftRight");

      if (state.mode === "ghost_mansion" && entity.role === "tracker") {
        entity.flashlightActive = isKeyPressed("Space") && entity.battery > 0;
      }
    } else if (entity.ai) {
      moveX = entity.intent?.x || 0;
      moveY = entity.intent?.y || 0;
      isSprinting = entity.intent?.sprint || false;
    }

    let speed = entity.speed || 150;

    // Mario Chase speed tuning
    if (state.mode === "mario_chase") {
      if (entity.role === "chaser") {
        // Mario chasers should be slightly slower than mario
        speed = 158; // Mario is 172
      } else if (entity.role === "mario") {
        speed = 172;
      }
    }

    // Ghost Hunter battery and disable logic
    if (state.mode === "ghost_mansion" && entity.role === "tracker") {
      if (entity.battery <= 0) {
        speed *= 0.5; // disabled/slowed when out of battery
      }
      if (entity.flashlightActive) {
        speed *= 0.85; // slowed while using flashlight
      }
      if (entity.fainted) {
        speed = 0;
      }

      // Super battery boost
      if (entity.superBatteryTimer > 0) {
        speed *= 1.2;
      }
    }

    if (isSprinting && !entity.fainted) {
      speed *= 1.3;
    }

    entity.vx = moveX * speed;
    entity.vy = moveY * speed;

    const nextX = entity.x + entity.vx * dt;
    const nextY = entity.y + entity.vy * dt;

    if (!checkCollision(world, nextX, entity.y, entity.radius)) {
      entity.x = nextX;
    }
    if (!checkCollision(world, entity.x, nextY, entity.radius)) {
      entity.y = nextY;
    }

    // Keep in bounds
    entity.x = Math.max(
      entity.radius,
      Math.min(world.map.width - entity.radius, entity.x),
    );
    entity.y = Math.max(
      entity.radius,
      Math.min(world.map.height - entity.radius, entity.y),
    );
  });
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
        // Super battery: shining your flashlight does not consume power
        if (entity.superBatteryTimer <= 0) {
          entity.battery = Math.max(0, entity.battery - dt * 15);
        }
      } else {
        // Slow recharge if not active? Actually the prompt says:
        // "ghost hunter battery should be able to drain and become disabled when battery runs out"
        // "normal battery refills your flashlight power completely"
        // Usually they don't recharge on their own in the original game.
      }

      if (entity.battery <= 0) {
        entity.flashlightActive = false;
      }
    }
  });
}

export function visibilitySystem(world, dt) {
  const ghost = world.entities.find((e) => e.role === "ghost");
  if (!ghost) return;

  world.entities.forEach((entity) => {
    if (state.mode === "ghost_mansion" && entity.role === "tracker") {
      const d = dist(entity, ghost);

      // Danger indicator: severe as they are closer
      entity.dangerLevel = 0;
      if (d < 400) {
        entity.dangerLevel = (400 - d) / 400; // 0 to 1
      }

      // Flashlight reveal logic
      if (entity.flashlightActive && !entity.fainted) {
        const dx = ghost.x - entity.x;
        const dy = ghost.y - entity.y;
        const angle = Math.atan2(dy, dx);
        const facing = entity.facing || 0;
        const diff = Math.abs(normalizeAngle(angle - facing));

        // Super battery increases flashlight range
        const range = entity.superBatteryTimer > 0 ? 350 : 200;

        if (d < range && diff < 0.5) {
          ghost.revealTimer = 0.5;
          // Super battery increases damage to ghost
          const damageMult = entity.superBatteryTimer > 0 ? 3 : 1;
          ghost.energy = Math.max(0, ghost.energy - dt * 20 * damageMult);
        }
      }
    }

    if (ghost.revealTimer > 0) {
      ghost.revealTimer -= dt;
    }
  });
}

export function interactionSystem(world, dt) {
  const ghost = world.entities.find((e) => e.role === "ghost");
  const trackers = world.entities.filter((e) => e.role === "tracker");

  if (state.mode === "ghost_mansion" && ghost) {
    trackers.forEach((tracker) => {
      if (!tracker.fainted) {
        const d = dist(tracker, ghost);
        // When the ghost touches a hunter, they will faint
        if (d < tracker.radius + ghost.radius) {
          tracker.fainted = true;
          tracker.reviveProgress = 0;
        }
      } else {
        // Can be revived if another hunter shines a light on them for 15 seconds
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
              // Super battery increases speed to revive teammates
              const reviveMult = other.superBatteryTimer > 0 ? 2 : 1;
              tracker.reviveProgress += dt * reviveMult;
            }
          }
        });

        if (tracker.reviveProgress >= 15) {
          tracker.fainted = false;
          tracker.reviveProgress = 0;
          tracker.battery = Math.max(tracker.battery, 30); // Give some battery on revive
        }
      }
    });
  }

  // Power-ups
  world.entities
    .filter((e) => e.type === "powerup")
    .forEach((pu) => {
      trackers.forEach((tracker) => {
        if (
          !tracker.fainted &&
          dist(tracker, pu) < tracker.radius + pu.radius
        ) {
          if (pu.kind === "battery") {
            tracker.battery = 100;
          } else if (pu.kind === "super_battery") {
            tracker.battery = 100;
            tracker.superBatteryTimer = 10;
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

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function objectiveSystem(world, dt) {
  if (!state.running) return;

  state.timeLeft = Math.max(0, state.timeLeft - dt * 1000);

  if (state.mode === "mario_chase") {
    const mario = world.entities.find((e) => e.role === "mario");
    const chasers = world.entities.filter((e) => e.role === "chaser");

    if (mario) {
      chasers.forEach((chaser) => {
        if (dist(mario, chaser) < mario.radius + chaser.radius) {
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
  // Simple scoring for now
  const player = world.entities.find((e) => e.id === state.playerId);
  if (player) {
    if (state.mode === "mario_chase") {
      player.score = Math.floor((20000 - state.timeLeft) / 100);
    } else {
      player.score =
        player.role === "ghost"
          ? Math.floor((18000 - state.timeLeft) / 100)
          : Math.floor(
              100 -
                (world.entities.find((e) => e.role === "ghost")?.energy || 0),
            );
    }
  }
}
