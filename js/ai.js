import { state } from "./game-state.js";

export function aiSystem(world, dt) {
  world.entities.forEach((entity) => {
    if (
      entity.id === state.playerId ||
      !entity.ai ||
      !entity.alive ||
      entity.fainted
    )
      return;

    if (state.mode === "mario_chase") {
      if (entity.role === "mario") {
        runFromChasers(entity, world, dt);
      } else if (entity.role === "chaser") {
        huntMario(entity, world, dt);
      } else if (entity.role === "yoshi_cart") {
        yoshiAI(entity, world, dt);
      }
    } else if (state.mode === "ghost_mansion") {
      if (entity.role === "ghost") {
        ghostAI(entity, world, dt);
      } else if (entity.role === "tracker") {
        trackerAI(entity, world, dt);
      }
    }
  });
}

function runFromChasers(entity, world, dt) {
  const chasers = world.entities.filter((e) => e.role === "chaser");
  let ax = 0,
    ay = 0;

  chasers.forEach((chaser) => {
    const d = dist(entity, chaser);
    if (d < 300) {
      ax += (entity.x - chaser.x) / d;
      ay += (entity.y - chaser.y) / d;
    }
  });

  if (ax === 0 && ay === 0) {
    // Random wander
    entity.wanderTimer = (entity.wanderTimer || 0) - dt;
    if (entity.wanderTimer <= 0) {
      entity.intent = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
      entity.wanderTimer = 1 + Math.random() * 2;
    }
  } else {
    const len = Math.hypot(ax, ay);
    entity.intent = { x: ax / len, y: ay / len, sprint: true };
  }
}

function huntMario(entity, world, dt) {
  const mario = world.entities.find((e) => e.role === "mario");
  if (!mario) return;

  const dx = mario.x - entity.x;
  const dy = mario.y - entity.y;
  const len = Math.hypot(dx, dy);

  entity.intent = { x: dx / len, y: dy / len };
}

function yoshiAI(entity, world, dt) {
  const mario = world.entities.find((e) => e.role === "mario");
  if (!mario) return;

  entity.stateTimer = (entity.stateTimer || 0) - dt;
  if (entity.stateTimer <= 0) {
    // Switch between Patrol and Home-In
    entity.aiState = entity.aiState === "patrol" ? "home" : "patrol";
    entity.stateTimer = 3 + Math.random() * 3;
    if (entity.aiState === "patrol") {
      entity.patrolTarget = {
        x: Math.random() * state.world.map.width,
        y: Math.random() * state.world.map.height
      };
    }
  }

  let tx = 0, ty = 0;
  if (entity.aiState === "patrol") {
    tx = entity.patrolTarget.x - entity.x;
    ty = entity.patrolTarget.y - entity.y;
  } else {
    // Home in on Mario
    tx = mario.x - entity.x;
    ty = mario.y - entity.y;
  }

  const len = Math.hypot(tx, ty);
  if (len > 5) {
    entity.intent = { x: tx / len, y: ty / len };
  } else if (entity.aiState === "patrol") {
     entity.stateTimer = 0; // Pick new patrol target
  }
}

function ghostAI(entity, world, dt) {
  const trackers = world.entities.filter(
    (e) => e.role === "tracker" && !e.fainted,
  );
  if (trackers.length === 0) return;

  // Ghost wants to touch hunters
  const target = trackers.sort((a, b) => dist(entity, a) - dist(entity, b))[0];
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const len = Math.hypot(dx, dy);

  entity.intent = { x: dx / len, y: dy / len, sprint: entity.revealTimer > 0 };
}

function trackerAI(entity, world, dt) {
  const ghost = world.entities.find((e) => e.role === "ghost");
  if (!ghost) return;

  // Trackers should look for ghost or revive fainted allies
  const faintedAlly = world.entities.find(
    (e) => e.role === "tracker" && e.fainted && e !== entity,
  );

  let target = ghost;
  if (faintedAlly && dist(entity, faintedAlly) < 400) {
    target = faintedAlly;
  }

  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const len = Math.hypot(dx, dy);

  entity.intent = { x: dx / len, y: dy / len };
  entity.facing = Math.atan2(dy, dx);
  entity.flashlightActive =
    (target === ghost && len < 250) || (target === faintedAlly && len < 100);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
