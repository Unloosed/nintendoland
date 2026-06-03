import { state, setPhase, Phases } from "./game-state.js";
import { filterWorldForRole } from "./visibility.js";

/**
 * Simulated authoritative server.
 * In a real scenario, this would run on a server or a WebWorker.
 */
export const Server = {
  tickRate: 30,
  history: [], // For lag compensation if needed
  lastProcessedTick: {},
  entities: [], // Authoritative server state

  init(initialEntities) {
      this.entities = JSON.parse(JSON.stringify(initialEntities));
      this.lastProcessedTick = {};
  },

  /**
   * Authoritative simulation of an input command.
   */
  processInput(playerId, command) {
    const dt = 1 / this.tickRate;
    const playerEntity = this.entities.find(e => e.id === playerId);
    if (!playerEntity || !playerEntity.alive) return;

    // Validate tick order
    const lastTick = this.lastProcessedTick[playerId] || 0;
    if (command.tick <= lastTick) return;
    this.lastProcessedTick[playerId] = command.tick;

    // 1. Validate Input (clamping move vector)
    const moveX = Math.max(-1, Math.min(1, command.moveX));
    const moveY = Math.max(-1, Math.min(1, command.moveY));
    const isSprinting = !!command.sprint;

    // 2. Authoritative Movement Physics
    // We reuse the logic from systems but ensure it's strictly governed by server state
    this.simulateMovement(playerEntity, moveX, moveY, isSprinting, dt, command);
  },

  simulateMovement(entity, moveX, moveY, isSprinting, dt, command) {
    // We'll perform a simplified version of the movement system here
    // In a real project, this would be a shared pure function
    const config = this.getMovementConfig(entity);
    const targetVx = moveX * config.maxSpeed * (isSprinting ? 1.3 : 1.0);
    const targetVy = moveY * config.maxSpeed * (isSprinting ? 1.3 : 1.0);
    const accel = (moveX !== 0 || moveY !== 0) ? config.acceleration : config.friction;

    entity.vx += (targetVx - entity.vx) * accel * dt;
    entity.vy += (targetVy - entity.vy) * accel * dt;

    const nextX = entity.x + entity.vx * dt;
    const nextY = entity.y + entity.vy * dt;

    // Collision check (Authoritative)
    if (!this.checkCollision(nextX, entity.y, entity.radius)) entity.x = nextX;
    if (!this.checkCollision(entity.x, nextY, entity.radius)) entity.y = nextY;

    // Abilities (Authoritative cooldowns)
    if (command.primary) {
        this.handlePrimaryAbility(entity, dt);
    }
  },

  getMovementConfig(entity) {
    // Shared constants from systems.js logic
    if (state.mode === "mario_chase") {
        return entity.role === "mario"
            ? { maxSpeed: 172, acceleration: 12, friction: 10 }
            : { maxSpeed: 158, acceleration: 10, friction: 10 };
    }
    return { maxSpeed: 150, acceleration: 8, friction: 10 };
  },

  checkCollision(x, y, radius) {
    return state.world.map.blockers.some(
      (b) => x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h
    );
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
    // In a real server, we would filter based on observerId visibility rules
    return {
      tick: state.tick,
      entities: this.entities.map(e => ({
          id: e.id,
          x: e.x,
          y: e.y,
          vx: e.vx,
          vy: e.vy,
          role: e.role,
          energy: e.energy,
          battery: e.battery,
          fainted: e.fainted
      })),
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
      } else {
          // Snap for now, ideally interpolate
          lEntity.x = sEntity.x;
          lEntity.y = sEntity.y;
          lEntity.vx = sEntity.vx;
          lEntity.vy = sEntity.vy;
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
              // Simplified re-simulation
              this.applyInputToEntity(local, entry.actions, dt);
          }
      }

      // Cleanup history older than server tick
      local.inputHistory = local.inputHistory.slice(historyIndex);
  },

  applyInputToEntity(entity, actions, dt) {
      // Re-use logic from Server.simulateMovement (simplified)
      const moveX = actions.moveX || 0;
      const moveY = actions.moveY || 0;
      const isSprinting = !!actions.sprint;

      const config = Server.getMovementConfig(entity);
      const targetVx = moveX * config.maxSpeed * (isSprinting ? 1.3 : 1.0);
      const targetVy = moveY * config.maxSpeed * (isSprinting ? 1.3 : 1.0);
      const accel = (moveX !== 0 || moveY !== 0) ? config.acceleration : config.friction;

      entity.vx += (targetVx - entity.vx) * accel * dt;
      entity.vy += (targetVy - entity.vy) * accel * dt;

      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
  }
};
