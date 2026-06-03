export const levels = {
  mario_chase: [
    {
      name: "Symmetrical Park",
      blockers: [
        { x: 320, y: 110, w: 110, h: 190 },
        { x: 850, y: 110, w: 110, h: 190 }, // Symmetrical
        { x: 320, y: 420, w: 110, h: 190 }, // Symmetrical
        { x: 850, y: 420, w: 110, h: 190 }, // Symmetrical
        { x: 540, y: 310, w: 200, h: 100 }  // Center
      ]
    },
    {
      name: "The Pillars",
      blockers: [
        { x: 200, y: 150, w: 60, h: 60 },
        { x: 200, y: 510, w: 60, h: 60 },
        { x: 1020, y: 150, w: 60, h: 60 },
        { x: 1020, y: 510, w: 60, h: 60 },
        { x: 400, y: 330, w: 60, h: 60 },
        { x: 820, y: 330, w: 60, h: 60 },
        { x: 610, y: 150, w: 60, h: 60 },
        { x: 610, y: 510, w: 60, h: 60 }
      ]
    }
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
        { x: 800, y: 440, w: 160, h: 40 } // Reduced width to ensure gap to x=1000
      ]
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
            { x: 890, y: 350, w: 40, h: 40 }
        ]
    }
  ]
};
