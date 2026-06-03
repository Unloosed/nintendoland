export const keys = new Set();

export function initInput() {
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected:", e.gamepad.id);
  });
}

export function isKeyPressed(code) {
  return keys.has(code);
}

export function getActions() {
  const actions = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    primary: false,
    secondary: false,
    minimap: false,
    restart: false,
  };

  // Keyboard
  actions.moveX = (isKeyPressed("KeyD") || isKeyPressed("ArrowRight") ? 1 : 0) -
                   (isKeyPressed("KeyA") || isKeyPressed("ArrowLeft") ? 1 : 0);
  actions.moveY = (isKeyPressed("KeyS") || isKeyPressed("ArrowDown") ? 1 : 0) -
                   (isKeyPressed("KeyW") || isKeyPressed("ArrowUp") ? 1 : 0);

  actions.sprint = isKeyPressed("ShiftLeft") || isKeyPressed("ShiftRight");
  actions.primary = isKeyPressed("Space");
  actions.secondary = isKeyPressed("KeyE");
  actions.minimap = isKeyPressed("KeyM");
  actions.restart = isKeyPressed("KeyR");

  // Gamepad
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;

    // Left stick
    if (Math.abs(pad.axes[0]) > 0.1) actions.moveX = pad.axes[0];
    if (Math.abs(pad.axes[1]) > 0.1) actions.moveY = pad.axes[1];

    // Buttons
    if (pad.buttons[0]?.pressed) actions.primary = true;
    if (pad.buttons[1]?.pressed) actions.secondary = true;
    if (pad.buttons[2]?.pressed) actions.sprint = true;
    if (pad.buttons[9]?.pressed) actions.restart = true;
    if (pad.buttons[8]?.pressed) actions.minimap = true;
  }

  // Normalize movement vector if keyboard pressed diagonally
  const len = Math.hypot(actions.moveX, actions.moveY);
  if (len > 1) {
    actions.moveX /= len;
    actions.moveY /= len;
  }

  return actions;
}

// Deprecated: keeping for compatibility during transition
export function getMovementInput() {
  const actions = getActions();
  if (actions.moveX === 0 && actions.moveY === 0) return { x: 0, y: 0, angle: null };
  const angle = Math.atan2(actions.moveY, actions.moveX);
  return { x: actions.moveX, y: actions.moveY, angle };
}
