export const keys = new Set();

export function initInput() {
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });
}

export function isKeyPressed(code) {
  return keys.has(code);
}

export function getMovementInput() {
  const moveX = (isKeyPressed("KeyD") ? 1 : 0) - (isKeyPressed("KeyA") ? 1 : 0);
  const moveY = (isKeyPressed("KeyS") ? 1 : 0) - (isKeyPressed("KeyW") ? 1 : 0);

  if (moveX === 0 && moveY === 0) return { x: 0, y: 0, angle: null };

  const len = Math.hypot(moveX, moveY);
  const angle = Math.atan2(moveY, moveX);
  return { x: moveX / len, y: moveY / len, angle };
}
