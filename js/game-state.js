export const Phases = {
  BOOT: "BOOT",
  FRONTEND: "FRONTEND",
  LOBBY: "LOBBY",
  MATCH: "MATCH",
  RESULTS: "RESULTS",
  REPLAY: "REPLAY",
};

export const state = {
  initialized: false,
  running: false,
  currentPhase: Phases.BOOT,
  mode: "mario_chase",
  role: "mario",
  timeLeft: 0,
  result: null,
  tick: 0,
  playerId: null,
  worlds: {
    [Phases.FRONTEND]: createWorld(),
    [Phases.LOBBY]: createWorld(),
    [Phases.MATCH]: createWorld(),
    [Phases.RESULTS]: createWorld(),
    [Phases.REPLAY]: createWorld(),
  },
  replay: {
    recording: [],
    isPlaying: false,
    currentFrame: 0,
  },
  ui: {
    showMinimap: true,
    toastTimer: 0,
    lastKnownThreat: null,
  },
};

// Helper to get current active world
Object.defineProperty(state, "world", {
  get() {
    return this.worlds[this.currentPhase] || this.worlds[Phases.MATCH];
  },
});

function createWorld() {
  return {
    entities: [],
    nextId: 1,
    map: {
      width: 1280,
      height: 720,
      blockers: [],
    },
  };
}

export function createEntity(data) {
  const world = state.world;
  const entity = {
    id: world.nextId++,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 10,
    color: "#ffffff",
    alive: true,
    components: {},
    ...data,
  };
  world.entities.push(entity);
  return entity;
}

export function resetState() {
  state.running = false;
  state.timeLeft = 0;
  state.result = null;
  state.tick = 0;
  state.playerId = null;
  // Reset all worlds
  state.worlds[Phases.FRONTEND] = createWorld();
  state.worlds[Phases.LOBBY] = createWorld();
  state.worlds[Phases.MATCH] = createWorld();
  state.worlds[Phases.RESULTS] = createWorld();
  state.worlds[Phases.REPLAY] = createWorld();
  state.ui.lastKnownThreat = null;
}

export function setPhase(phase) {
  console.log(`Transitioning to phase: ${phase}`);
  state.currentPhase = phase;
}
