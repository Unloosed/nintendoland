import { state, Phases, setPhase } from "./game-state.js";
import { initInput, isKeyPressed, keys } from "./input.js";
import { setupUI, updateHUD } from "./ui.js";
import { render } from "./render.js";
import { aiSystem } from "./ai.js";
import { updateCamera } from "./camera.js";
import { Server, Replication } from "./network.js";
import { getActions } from "./input.js";
import { audio } from "./audio.js";
import {
  movementSystem,
  batterySystem,
  visibilitySystem,
  interactionSystem,
  objectiveSystem,
  scoringSystem,
} from "./systems.js";

function init() {
  window.state = state; // Expose for debugging and verification
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
    if (state.tick % 60 === 0) console.log(`Loop tick: ${state.tick}, phase: ${state.currentPhase}`);

    // Simulation runs during LOBBY and MATCH
    if (state.currentPhase === Phases.LOBBY || state.currentPhase === Phases.MATCH) {
      updateCamera(dt);
      if (state.running) {
        if (state.countdown > 0) {
          const prev = Math.ceil(state.countdown);
          state.countdown -= dt;
          if (Math.ceil(state.countdown) < prev) {
            audio.playTone(440, 'sine', 0.1);
          }
          if (state.countdown <= 0) {
            audio.playStart();
          }
        }

        state.tick++;

        // 1. Client Input Gathering
        const actions = getActions();
        const command = {
          tick: state.tick,
          ...actions
        };

        // 2. Simulated Server Processing (Snapshot is delayed by 100ms)
        Server.update(state.playerId, command, dt);
        if (state.tick % 3 === 0) { // 10Hz snapshot rate
            setTimeout(() => {
                const snapshot = Server.generateSnapshot(state.playerId);
                Replication.applySnapshot(snapshot);
            }, 100); // 100ms artificial latency
        }

        // 3. System Orchestration
        aiSystem(state.world, dt);
        movementSystem(state.world, dt); // This will handle prediction internally

        if (state.currentPhase === Phases.MATCH && state.countdown <= 0) {
          batterySystem(state.world, dt);
          visibilitySystem(state.world, dt);
          interactionSystem(state.world, dt);
          objectiveSystem(state.world, dt);
          scoringSystem(state.world);

          // Record for Replay
          if (state.tick % 2 === 0) { // Record at 15Hz
            state.replay.recording.push(JSON.parse(JSON.stringify({
              tick: state.tick,
              entities: state.world.entities,
              timeLeft: state.timeLeft
            })));
          }
        }

        if (isKeyPressed("KeyR")) {
          location.reload();
        }
        if (isKeyPressed("KeyM")) {
          state.ui.showMinimap = !state.ui.showMinimap;
          keys.delete("KeyM");
        }
        if (isKeyPressed("KeyV")) {
          state.ui.debugVisibility = !state.ui.debugVisibility;
          keys.delete("KeyV");
        }
      }
    }

    if (state.currentPhase === Phases.REPLAY) {
      const frame = state.replay.recording[state.replay.currentFrame];
      if (frame && state.replay.isPlaying) {
        state.world.entities = frame.entities;
        state.timeLeft = frame.timeLeft;
        state.replay.currentFrame++;
        if (state.replay.currentFrame >= state.replay.recording.length) {
          state.replay.isPlaying = false;
          setPhase(Phases.RESULTS);
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
