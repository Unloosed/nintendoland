import { state, setPhase, Phases } from "./game-state.js";
import { filterWorldForRole } from "./visibility.js";

/**
 * Simulated authoritative server.
 * In a real scenario, this would run on a server or a WebWorker.
 */
export const Server = {
  tickRate: 30,
  history: [],

  processInput(playerId, actions, dt) {
    // 1. Validate Input (speed limits, cooldowns)
    // 2. Simulate authoritative state
    // 3. Store in history for lag compensation (future)
  },

  generateSnapshot(observerId) {
    // Generate role-specific filtered snapshot
    return {
      tick: state.tick,
      entities: filterWorldForRole(state.world, observerId),
      timeLeft: state.timeLeft,
      result: state.result
    };
  }
};

/**
 * Client replication layer.
 */
export const Replication = {
  applySnapshot(snapshot) {
    if (snapshot.tick < state.tick) return; // Ignore old snapshots

    // Reconcile non-local entities
    snapshot.entities.forEach(sEntity => {
      if (sEntity.id === state.playerId) {
        // Local player reconciliation (optional: snap if too far)
        return;
      }

      const lEntity = state.world.entities.find(e => e.id === sEntity.id);
      if (lEntity) {
        // Interpolation would happen here
        Object.assign(lEntity, sEntity);
      }
    });

    state.timeLeft = snapshot.timeLeft;
    state.result = snapshot.result;
  }
};
