import { state, createEntity, setPhase, Phases } from "./game-state.js";
import { levels } from "./levels.js";

/**
 * Data-driven role definitions.
 */
const Roles = {
  mario: {
    maxSpeed: 172,
    acceleration: 12,
    radius: 14,
    color: "#30d5c8",
    abilities: ["burst_dash"],
    camera: "chase"
  },
  chaser: {
    maxSpeed: 158,
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
  }
};

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

export const AttractionPacks = {
  mario_chase: {
    objectives: [
      {
        id: "chase",
        type: "composite",
        subObjectives: [
          { type: "timer_expire", duration: 20000, winRole: "mario", reason: "Mario escaped!" },
          { type: "proximity_tag", targetRole: "mario", chaserRole: "chaser", winRole: "chaser", reason: "Mario was caught!" }
        ]
      }
    ]
  },
  ghost_mansion: {
    objectives: [
      {
        id: "haunt",
        type: "composite",
        subObjectives: [
          { type: "timer_expire", duration: 18000, winRole: "ghost", reason: "Time expired!" },
          { type: "entity_stat_zero", role: "ghost", stat: "energy", winRole: "tracker", reason: "Ghost was defeated!" },
          { type: "all_fainted", role: "tracker", winRole: "ghost", reason: "All hunters fainted!" }
        ]
      }
    ]
  }
};

export function initApp() {
  setPhase(Phases.MATCH);
  const availableLevels = levels[state.mode];
  const level = availableLevels[Math.floor(Math.random() * availableLevels.length)];
  state.world.map.blockers = level.blockers;

  // Load attraction pack data
  const pack = AttractionPacks[state.mode];
  state.world.objectives = JSON.parse(JSON.stringify(pack.objectives));
  state.world.currentObjectiveIndex = 0;

  if (state.mode === "mario_chase") {
    initMarioChase();
  } else if (state.mode === "ghost_mansion") {
    initGhostMansion();
  }

  import("./network.js").then(m => {
      m.Server.init(state.world.entities);
  });

  state.running = true;
  state.initialized = true;
}

function initMarioChase() {
  state.timeLeft = 20000;
  const config = Roles.mario;

  const mario = createEntity({
    role: "mario",
    x: 180,
    y: 360,
    ...config,
    ai: state.role !== "mario",
  });

  if (state.role === "mario") state.playerId = mario.id;

  for (let i = 0; i < 3; i++) {
    const chaserConfig = Roles.chaser;
    const chaser = createEntity({
      role: "chaser",
      x: 1000 + i * 30,
      y: 200 + i * 150,
      ...chaserConfig,
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
  const ghostConfig = Roles.ghost;

  const ghost = createEntity({
    role: "ghost",
    x: 190,
    y: 360,
    ...ghostConfig,
    energy: 100,
    ai: state.role !== "ghost",
  });

  if (state.role === "ghost") state.playerId = ghost.id;

  for (let i = 0; i < 3; i++) {
    const trackerConfig = Roles.tracker;
    const tracker = createEntity({
      role: "tracker",
      x: 1100 + i * 40,
      y: 100 + i * 200,
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
  }

  // Power-ups
  createEntity({ type: "powerup", kind: "battery", x: 640, y: 360, radius: 8, color: "#f5c451" });
  createEntity({ type: "powerup", kind: "super_battery", x: 640, y: 100, radius: 10, color: "#30d5c8" });
}
