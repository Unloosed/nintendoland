/**
 * Shared utility functions for Nintendo Land Reimagined.
 */

/**
 * Checks if a circular entity at (x, y) with a given radius collides with any map blockers.
 */
export function checkCollision(world, x, y, radius) {
  const isBlocker = world.map.blockers.some(
    (b) =>
      x + radius > b.x &&
      x - radius < b.x + b.w &&
      y + radius > b.y &&
      y - radius < b.y + b.h,
  );
  return isBlocker;
}

/**
 * Calculates the Euclidean distance between two points with x and y properties.
 */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Finds a safe (non-colliding) position near the desired (x, y).
 */
export function findSafePosition(x, y, radius, world) {
  if (!checkCollision(world, x, y, radius)) {
    return { x, y };
  }

  // Search in expanding circles
  for (let r = 20; r < 500; r += 20) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const tx = x + Math.cos(angle) * r;
      const ty = y + Math.sin(angle) * r;

      // Keep within world bounds
      if (tx < radius || tx > world.map.width - radius || ty < radius || ty > world.map.height - radius) {
        continue;
      }

      if (!checkCollision(world, tx, ty, radius)) {
        return { x: tx, y: ty };
      }
    }
  }
  return { x, y }; // Fallback to original position if no safe spot found
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, t);
}

/**
 * Linear interpolation between two angles, handling wrap-around.
 */
export function lerpAngle(a, b, t) {
  const d = normalizeAngle(b - a);
  return a + d * Math.min(1, t);
}

/**
 * Normalizes an angle to be within [-PI, PI].
 */
export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Gets the zone name for a given position in Mario Chase.
 */
export function getZoneName(x, y) {
  const midX = 640;
  const midY = 360;
  if (x < midX && y < midY) return "RED";
  if (x >= midX && y < midY) return "BLUE";
  if (x < midX && y >= midY) return "GREEN";
  return "YELLOW";
}
