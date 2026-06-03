import { state, createEntity, setPhase, Phases } from "./game-state.js";
import { levels } from "./levels.js";

export function initLobby() {
  setPhase(Phases.LOBBY);
  state.world.map.blockers = [
    { x: 400, y: 200, w: 480, h: 40 },
    { x: 400, y: 480, w: 480, h: 40 },
  ];

  const player = createEntity({
    role: "lobby_player",
    x: 640,
    y: 360,
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
  const level =
    availableLevels[Math.floor(Math.random() * availableLevels.length)];
  state.world.map.blockers = level.blockers;

  if (state.mode === "mario_chase") {
    initMarioChase();
  } else if (state.mode === "ghost_mansion") {
    initGhostMansion();
  }

  state.running = true;
  state.initialized = true;
}

function initMarioChase() {
  state.timeLeft = 20000;

  const mario = createEntity({
    role: "mario",
    x: 180,
    y: 360,
    radius: 14,
    color: "#30d5c8",
    speed: 172,
    energy: 100,
    ai: state.role !== "mario",
  });

  if (state.role === "mario") state.playerId = mario.id;

  for (let i = 0; i < 3; i++) {
    const chaser = createEntity({
      role: "chaser",
      x: 1000 + i * 30,
      y: 200 + i * 150,
      radius: 13,
      color: "#59a9ff",
      speed: 158,
      ai: true,
    });
    if (state.role === "chaser" && i === 0) {
      state.playerId = chaser.id;
      chaser.ai = false;
    }
  }
}

function initGhostMansion() {
  state.timeLeft = 18000;

  const ghost = createEntity({
    role: "ghost",
    x: 190,
    y: 360,
    radius: 13,
    color: "#ff6b88",
    speed: 165,
    energy: 100,
    ai: state.role !== "ghost",
  });

  if (state.role === "ghost") state.playerId = ghost.id;

  for (let i = 0; i < 3; i++) {
    const tracker = createEntity({
      role: "tracker",
      x: 1100 + i * 40, // Moved from 1000 to avoid wall at x=1000
      y: 100 + i * 200,
      radius: 14,
      color: "#59a9ff",
      speed: 155,
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
  }

  // Power-ups
  createEntity({
    type: "powerup",
    kind: "battery",
    x: 640,
    y: 360,
    radius: 8,
    color: "#f5c451",
  });

  createEntity({
    type: "powerup",
    kind: "super_battery",
    x: 640,
    y: 100,
    radius: 10,
    color: "#30d5c8",
  });
}
