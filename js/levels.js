export const levels = {
  mario_chase: [
    {
      name: "Symmetrical Park",
      blockers: [
        { x: 320, y: 110, w: 110, h: 190 },
        { x: 850, y: 110, w: 110, h: 190 }, // Symmetrical
        { x: 320, y: 420, w: 110, h: 190 }, // Symmetrical
        { x: 850, y: 420, w: 110, h: 190 }, // Symmetrical
        { x: 540, y: 310, w: 200, h: 100 }, // Center
      ],
      spawns: {
        mario: { x: 180, y: 360 },
        chaser: [
          { x: 1100, y: 200 },
          { x: 1100, y: 360 },
          { x: 1100, y: 520 },
        ],
        yoshi_cart: [
          { x: 1150, y: 150 },
          { x: 1150, y: 570 },
        ],
        powerup: [
          { x: 640, y: 360, kind: "super_star" },
        ],
      },
    },
    {
      name: "Mud River Run",
      blockers: [
        { x: 400, y: 0, w: 20, h: 280 },
        { x: 400, y: 440, w: 20, h: 280 },
        { x: 860, y: 0, w: 20, h: 280 },
        { x: 860, y: 440, w: 20, h: 280 },
      ],
      mud: [
        { x: 420, y: 0, w: 440, h: 720 }, // Central river of mud
      ],
      bridges: [
        { x: 400, y: 320, w: 480, h: 80, state: "intact" },
      ],
      spawns: {
        mario: { x: 100, y: 360 },
        chaser: [
          { x: 1150, y: 200 },
          { x: 1150, y: 360 },
          { x: 1150, y: 520 },
        ],
        yoshi_cart: [
          { x: 1000, y: 100 },
          { x: 1000, y: 620 },
        ],
        powerup: [
          { x: 640, y: 360, kind: "super_star" },
        ],
      },
    },
    {
      name: "Slide Hill",
      blockers: [
        { x: 100, y: 100, w: 200, h: 200 },
        { x: 980, y: 100, w: 200, h: 200 },
        { x: 100, y: 420, w: 200, h: 200 },
        { x: 980, y: 420, w: 200, h: 200 },
      ],
      slopes: [
        { x: 300, y: 300, w: 680, h: 120, dirX: 0, dirY: 1 }, // Sloping down
      ],
      spawns: {
        mario: { x: 640, y: 150 },
        chaser: [
          { x: 100, y: 640 },
          { x: 640, y: 640 },
          { x: 1180, y: 640 },
        ],
        yoshi_cart: [
          { x: 50, y: 50 },
          { x: 1230, y: 50 },
        ],
        powerup: [
          { x: 640, y: 360, kind: "super_star" },
        ],
      },
    },
  ],
  ghost_mansion: [
    {
      name: "Tight Corridors",
      blockers: [
        { x: 200, y: 0, w: 40, h: 280 },
        { x: 200, y: 360, w: 40, h: 360 },
        { x: 400, y: 120, w: 40, h: 480 },
        { x: 600, y: 0, w: 40, h: 200 },
        { x: 600, y: 300, w: 40, h: 120 },
        { x: 600, y: 520, w: 40, h: 200 },
        { x: 800, y: 120, w: 40, h: 480 },
        { x: 1000, y: 0, w: 40, h: 280 },
        { x: 1000, y: 360, w: 40, h: 360 },
        // Horizontal connectors - carefully placed to not enclose
        { x: 240, y: 240, w: 160, h: 40 },
        { x: 800, y: 440, w: 160, h: 40 }, // Reduced width to ensure gap to x=1000
      ],
      spawns: {
        ghost: { x: 100, y: 360 },
        tracker: [
          { x: 1150, y: 100 },
          { x: 1150, y: 360 },
          { x: 1150, y: 620 },
        ],
        powerup: [
          { x: 500, y: 360, kind: "battery" },
          { x: 700, y: 360, kind: "super_battery" },
        ],
      },
    },
    {
      name: "Open Maze",
      blockers: [
        { x: 150, y: 150, w: 400, h: 40 },
        { x: 150, y: 150, w: 40, h: 400 },
        { x: 730, y: 150, w: 400, h: 40 },
        { x: 1090, y: 150, w: 40, h: 400 },
        { x: 150, y: 530, w: 400, h: 40 },
        { x: 730, y: 530, w: 400, h: 40 },
        { x: 590, y: 0, w: 40, h: 250 },
        { x: 590, y: 470, w: 40, h: 250 },
        // Add some small internal pillars
        { x: 350, y: 350, w: 40, h: 40 },
        { x: 890, y: 350, w: 40, h: 40 },
      ],
      spawns: {
        ghost: { x: 640, y: 360 },
        tracker: [
          { x: 50, y: 50 },
          { x: 1230, y: 50 },
          { x: 640, y: 670 },
        ],
        powerup: [
          { x: 300, y: 300, kind: "battery" },
          { x: 980, y: 300, kind: "super_battery" },
        ],
      },
    },
  ],
};
