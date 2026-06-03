import { state, setPhase, Phases } from "./game-state.js";
import { filterWorldForRole } from "./visibility.js";
import { applyMovement } from "./physics.js";
import { aiSystem } from "./ai.js";
import {
    batterySystem,
    visibilitySystem,
    interactionSystem,
    objectiveSystem,
} from "./systems.js";

/**
 * Simulated authoritative server.
 * In a real scenario, this would run on a server or a WebWorker.
 */
export const Server = {
  tickRate: 30,
  history: [], // For lag compensation: [ { tick, entities, timeLeft, result } ]
  lastProcessedTick: {},
  world: null, // Authoritative server world state

  init(initialWorld) {
      // Clone the initial world state
      this.world = JSON.parse(JSON.stringify(initialWorld));
      this.lastProcessedTick = {};
      this.history = [];
  },

  /**
   * Authoritative simulation of an input command and AI.
   */
  update(playerId, command, dt) {
    if (!this.world || !state.running) return;

    // 1. Process player input
    if (command) {
        const playerEntity = this.world.entities.find(e => e.id === playerId);
        if (playerEntity && playerEntity.alive) {
            // Validate tick order
            const lastTick = this.lastProcessedTick[playerId] || 0;
            if (command.tick > lastTick) {
                this.lastProcessedTick[playerId] = command.tick;

                // Validate Input (clamping move vector)
                const moveX = Math.max(-1, Math.min(1, command.moveX || 0));
                const moveY = Math.max(-1, Math.min(1, command.moveY || 0));
                const isSprinting = !!command.sprint;

                applyMovement(playerEntity, this.world, moveX, moveY, isSprinting, dt);

                // Abilities (Authoritative cooldowns)
                if (command.primary) {
                    this.handlePrimaryAbility(playerEntity, dt);
                }

                // Track for lag compensation
                playerEntity.lastTick = command.tick;
            }
        }
    }

    // 2. Run AI for NPCs
    aiSystem(this.world, dt);

    // 3. Move NPCs and process cooldowns
    this.world.entities.forEach(entity => {
        if (entity.id !== playerId && entity.alive && entity.ai) {
            const moveX = entity.intent?.x || 0;
            const moveY = entity.intent?.y || 0;
            const isSprinting = entity.intent?.sprint || false;
            applyMovement(entity, this.world, moveX, moveY, isSprinting, dt);
        }

        if (entity.burstTimer > 0) entity.burstTimer -= dt;
        if (entity.burstCooldown > 0) entity.burstCooldown -= dt;
    });

    // 4. Run Gameplay Systems (Authoritative)
    batterySystem(this.world, dt);
    visibilitySystem(this.world, dt);
    interactionSystem(this.world, dt);

    // Pass history to world for lag compensation systems
    this.world.history = this.history;

    // Pass fake 'state' to objective system to update authoritative result
    const mockState = {
        running: true,
        timeLeft: state.timeLeft,
        result: null,
        role: "server" // Server doesn't care about personal win/loss yet
    };
    // Note: objectiveSystem in systems.js uses 'state' globally.
    // For a true sim we should refactor systems to take a state object,
    // but for this prototype we'll let it use the global 'state' but sync result back.
    objectiveSystem(this.world, dt);

    // 5. Update history for lag compensation
    this.history.push({
        tick: state.tick,
        entities: JSON.parse(JSON.stringify(this.world.entities)),
        timeLeft: state.timeLeft,
        result: state.result
    });
    if (this.history.length > 60) this.history.shift();
  },

  handlePrimaryAbility(entity, dt) {
      if (state.mode === "mario_chase" && entity.role === "mario") {
          if ((entity.burstCooldown || 0) <= 0) {
              entity.burstTimer = 0.5;
              entity.burstCooldown = 5;
          }
      }
  },

  generateSnapshot(observerId) {
    if (!this.world) return null;
    const observer = this.world.entities.find(e => e.id === observerId);

    return {
      tick: state.tick,
      entities: this.world.entities.map(e => {
          const snapshot = {
              id: e.id,
              role: e.role,
              energy: e.energy,
              battery: e.battery,
              fainted: e.fainted,
              alive: e.alive,
              color: e.color
          };

          // Role-based visibility filtering (Server-side suppression)
          let visible = true;
          if (observer) {
              if (state.mode === "mario_chase") {
                  if (observer.role === "chaser" && e.role === "mario") {
                      const d = Math.hypot(observer.x - e.x, observer.y - e.y);
                      if (!e.revealTimer && d > 300) visible = false;
                  }
              } else if (state.mode === "ghost_mansion") {
                  if (observer.role === "tracker" && e.role === "ghost") {
                      if (!e.revealTimer) visible = false;
                  }
              }
          }

          if (visible || e.id === observerId) {
              snapshot.x = e.x;
              snapshot.y = e.y;
              snapshot.vx = e.vx;
              snapshot.vy = e.vy;
              snapshot.facing = e.facing;
          } else {
              snapshot.hidden = true;
          }

          return snapshot;
      }),
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
    // 1. Reconcile other entities (Interpolation would happen here)
    snapshot.entities.forEach(sEntity => {
      const lEntity = state.world.entities.find(e => e.id === sEntity.id);
      if (!lEntity) return;

      if (sEntity.id === state.playerId) {
          this.reconcileLocalPlayer(lEntity, sEntity, snapshot.tick);
      } else if (!sEntity.hidden) {
          // Snap for now, ideally interpolate
          lEntity.x = sEntity.x;
          lEntity.y = sEntity.y;
          lEntity.vx = sEntity.vx;
          lEntity.vy = sEntity.vy;
          lEntity.facing = sEntity.facing;
          lEntity.hidden = false;
      } else {
          // Entity is hidden. Update last-seen position.
          if (lEntity.x !== undefined && !lEntity.hidden) {
              lEntity.lastSeenX = lEntity.x;
              lEntity.lastSeenY = lEntity.y;
              lEntity.lastSeenTick = snapshot.tick;
          }
          lEntity.hidden = true;
      }

      // Sync stats
      lEntity.energy = sEntity.energy;
      lEntity.battery = sEntity.battery;
      lEntity.fainted = sEntity.fainted;
    });

    state.timeLeft = snapshot.timeLeft;
    state.result = snapshot.result;
  },

  reconcileLocalPlayer(local, server, serverTick) {
      if (!local.inputHistory) return;

      // Find the historical entry for this server tick
      const historyIndex = local.inputHistory.findIndex(h => h.tick === serverTick);
      if (historyIndex === -1) return;

      // Check for significant deviation
      const dx = Math.abs(local.inputHistory[historyIndex].startPos.x - server.x);
      const dy = Math.abs(local.inputHistory[historyIndex].startPos.y - server.y);

      if (dx > 2 || dy > 2) {
          console.log(`Reconciling local player at tick ${serverTick}. Error: ${dx.toFixed(2)}, ${dy.toFixed(2)}`);

          // Reset local state to server's authoritative state
          local.x = server.x;
          local.y = server.y;
          local.vx = server.vx;
          local.vy = server.vy;

          // Re-play all inputs since that tick
          const dt = 1 / Server.tickRate;
          for (let i = historyIndex + 1; i < local.inputHistory.length; i++) {
              const entry = local.inputHistory[i];
              applyMovement(local, state.world, entry.actions.moveX || 0, entry.actions.moveY || 0, !!entry.actions.sprint, dt);
          }
      }

      // Cleanup history older than server tick
      local.inputHistory = local.inputHistory.slice(historyIndex);
  }
};
