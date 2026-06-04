import { state, createEntity, setPhase, Phases } from "./game-state.js";
import { levels } from "./levels.js";
import { findSafePosition } from "./utils.js";

/**
 * Data-driven role definitions.
 */
const Roles = {
  mario: {
    maxSpeed: 158,
    acceleration: 12,
    radius: 14,
    color: "#30d5c8",
    abilities: ["burst_dash"],
    camera: "chase"
  },
  chaser: {
    maxSpeed: 172,
    acceleration: 10,
    radius: 13,
    color: "#59a9ff",
    abilities: [],
    camera: "topdown"
  },
  ghost: {
    maxSpeed: 165,
    radius: 13,
    color: "#ff6b88",
    abilities: [],
    camera: "chase"
  },
  tracker: {
    maxSpeed: 155,
    radius: 14,
    color: "#59a9ff",
    abilities: ["flashlight"],
    camera: "topdown"
  },
  yoshi_cart: {
    maxSpeed: 140,
    radius: 12,
    color: "#2ecc71",
    abilities: [],
    camera: "topdown"
  }
};

export function initLobby() {
  setPhase(Phases.LOBBY);
  state.world.map.blockers = [
    { x: 400, y: 200, w: 480, h: 40 },
    { x: 400, y: 480, w: 480, h: 40 },
  ];

  const pos = findSafePosition(640, 360, 15, state.world);
  const player = createEntity({
    role: "lobby_player",
    x: pos.x,
    y: pos.y,
    radius: 15,
    color: "#30d5c8",
    speed: 200,
  });
  state.playerId = player.id;
  state.running = true;
}

export function initApp() {
  setPhase(Phases.MATCH);
  const availableLevels = levels[state.mode];
  const level = availableLevels[Math.floor(Math.random() * availableLevels.length)];
  state.world.map.blockers = level.blockers;
  state.world.map.mud = level.mud || [];
  state.world.map.bridges = level.bridges || [];
  state.world.map.slopes = level.slopes || [];

  if (state.mode === "mario_chase") {
    initMarioChase(level);
  } else if (state.mode === "ghost_mansion") {
    initGhostMansion(level);
  }

  state.running = true;
  state.initialized = true;
}

function initMarioChase(level) {
  state.timeLeft = 120000;
  state.marioHeadStart = 10;
  const config = Roles.mario;

  const marioSpawn = level.spawns.mario;
  const marioPos = findSafePosition(marioSpawn.x, marioSpawn.y, config.radius, state.world);

  const mario = createEntity({
    role: "mario",
    x: marioPos.x,
    y: marioPos.y,
    ...config,
    ai: state.role !== "mario",
  });

  if (state.role === "mario") state.playerId = mario.id;

  // Yoshi Carts if only 1 human Toad
  if (state.role !== "mario") {
    const yoshiSpawns = level.spawns.yoshi_cart;
    yoshiSpawns.forEach(spawn => {
      const pos = findSafePosition(spawn.x, spawn.y, Roles.yoshi_cart.radius, state.world);
      createEntity({
        role: "yoshi_cart",
        x: pos.x,
        y: pos.y,
        ...Roles.yoshi_cart,
        ai: true,
      });
    });
  }

  const chaserSpawns = level.spawns.chaser;
  chaserSpawns.forEach((spawn, i) => {
    const chaserConfig = Roles.chaser;
    const pos = findSafePosition(spawn.x, spawn.y, chaserConfig.radius, state.world);
    const chaser = createEntity({
      role: "chaser",
      x: pos.x,
      y: pos.y,
      ...chaserConfig,
      ai: true,
    });
    if (state.role === "chaser" && i === 0) {
      state.playerId = chaser.id;
      chaser.ai = false;
    }
  });

  // Power-ups
  const puSpawns = level.spawns.powerup;
  puSpawns.forEach(spawn => {
    const pos = findSafePosition(spawn.x, spawn.y, 10, state.world);
    createEntity({
      type: "powerup",
      kind: spawn.kind,
      x: pos.x,
      y: pos.y,
      radius: spawn.kind === "super_star" ? 12 : 8,
      color: spawn.kind === "super_star" ? "#f1c40f" : "#f5c451",
      delayed: spawn.kind === "super_star"
    });
  });
}

function initGhostMansion(level) {
  state.timeLeft = 18000;
  const ghostConfig = Roles.ghost;

  const ghostSpawn = level.spawns.ghost;
  const ghostPos = findSafePosition(ghostSpawn.x, ghostSpawn.y, ghostConfig.radius, state.world);

  const ghost = createEntity({
    role: "ghost",
    x: ghostPos.x,
    y: ghostPos.y,
    ...ghostConfig,
    energy: 100,
    ai: state.role !== "ghost",
  });

  if (state.role === "ghost") state.playerId = ghost.id;

  const trackerSpawns = level.spawns.tracker;
  trackerSpawns.forEach((spawn, i) => {
    const trackerConfig = Roles.tracker;
    const pos = findSafePosition(spawn.x, spawn.y, trackerConfig.radius, state.world);
    const tracker = createEntity({
      role: "tracker",
      x: pos.x,
      y: pos.y,
      ...trackerConfig,
      battery: 100,
      fainted: false,
      reviveProgress: 0,
      superBatteryTimer: 0,
      ai: true,
    });
    if (state.role === "tracker" && i === 0) {
      state.playerId = tracker.id;
      tracker.ai = false;
    }
  });

  // Power-ups
  const puSpawns = level.spawns.powerup;
  puSpawns.forEach(spawn => {
    const pos = findSafePosition(spawn.x, spawn.y, 10, state.world);
    createEntity({
      type: "powerup",
      kind: spawn.kind,
      x: pos.x,
      y: pos.y,
      radius: spawn.kind === "super_battery" ? 10 : 8,
      color: spawn.kind === "super_battery" ? "#30d5c8" : "#f5c451"
    });
  });
}
