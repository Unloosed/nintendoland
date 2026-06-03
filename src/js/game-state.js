export const state = {
  initialized: false,
  running: false,
  mode: 'mario_chase',
  role: 'mario',
  timeLeft: 0,
  result: null,
  tick: 0,
  playerId: null,
  world: {
    entities: [],
    nextId: 1,
    map: {
      width: 1280,
      height: 720,
      blockers: []
    }
  },
  ui: {
    showMinimap: true,
    toastTimer: 0,
    lastKnownThreat: null
  }
};

export function createEntity(data) {
  const entity = {
    id: state.world.nextId++,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 10,
    color: '#ffffff',
    alive: true,
    components: {},
    ...data
  };
  state.world.entities.push(entity);
  return entity;
}

export function resetState() {
  state.running = false;
  state.timeLeft = 0;
  state.result = null;
  state.tick = 0;
  state.playerId = null;
  state.world.entities = [];
  state.world.nextId = 1;
  state.world.map.blockers = [];
  state.ui.lastKnownThreat = null;
}
