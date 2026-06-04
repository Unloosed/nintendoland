import { state, Phases, setPhase } from "./game-state.js";
import { initInput, isKeyPressed, keys } from "./input.js";
import { setupUI, updateHUD } from "./ui.js";
import { render } from "./render.js";
import { aiSystem } from "./ai.js";
import { updateCamera } from "./camera.js";
import {
  movementSystem,
  batterySystem,
  visibilitySystem,
  interactionSystem,
  objectiveSystem,
  scoringSystem,
} from "./systems.js";

function init() {
  console.log("Initializing game...");
  try {
    initInput();
    setupUI();
    setPhase(Phases.FRONTEND);
    console.log("Input and UI setup complete. Phase set to FRONTEND.");
  } catch (e) {
    console.error("Error during initialization:", e);
  }

  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // Simulation runs during LOBBY and MATCH
    if (state.currentPhase === Phases.LOBBY || state.currentPhase === Phases.MATCH) {
      updateCamera(dt);
      if (state.running) {
        state.tick++;

        // System Orchestration
        aiSystem(state.world, dt);
        movementSystem(state.world, dt);

        if (state.currentPhase === Phases.MATCH) {
          batterySystem(state.world, dt);
          visibilitySystem(state.world, dt);
          interactionSystem(state.world, dt);
          objectiveSystem(state.world, dt);
          scoringSystem(state.world);

          if (state.mode === "mario_chase" && state.tick % 15 === 0) {
            const mario = state.world.entities.find(e => e.role === "mario");
            if (mario) {
              state.marioPath.push({ x: mario.x, y: mario.y });
            }
          }
        }

        if (isKeyPressed("KeyR")) {
          location.reload();
        }
        if (isKeyPressed("KeyM")) {
          state.ui.showMinimap = !state.ui.showMinimap;
          // Add a small delay to avoid rapid toggling
          keys.delete("KeyM");
        }
      }
    }

    updateHUD();
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
