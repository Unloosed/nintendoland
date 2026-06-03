import { state } from "./game-state.js";

export function getMovementConfig(entity) {
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

export function applyMovement(entity, world, moveX, moveY, isSprinting, dt) {
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

export function checkCollision(world, x, y, radius) {
  if (!world.map || !world.map.blockers) return false;
  return world.map.blockers.some(
    (b) =>
      x + radius > b.x &&
      x - radius < b.x + b.w &&
      y + radius > b.y &&
      y - radius < b.y + b.h,
  );
}
