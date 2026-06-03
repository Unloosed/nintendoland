import { state, resetState, setPhase, Phases } from "./game-state.js";
import { initApp, initLobby } from "./app.js";
import { audio } from "./audio.js";

export function setupUI() {
  const ui = {
    modeGrid: document.getElementById("modeGrid"),
    roleGrid: document.getElementById("roleGrid"),
    startButton: document.getElementById("startButton"),
    launchButton: document.getElementById("launchButton"),
    lobbyControls: document.getElementById("lobbyControls"),
    cycleButton: document.getElementById("cycleButton"),
    playAgainButton: document.getElementById("playAgainButton"),
    menuToggle: document.getElementById("menuToggle"),
    drawerBackdrop: document.getElementById("drawerBackdrop"),
    startOverlay: document.getElementById("startOverlay"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultTitle: document.getElementById("resultTitle"),
    resultBody: document.getElementById("resultBody"),
  };

  const modes = [
    { id: "mario_chase", name: "Mario Chase", desc: "Symmetrical pursuit" },
    {
      id: "ghost_mansion",
      name: "Luigi's Ghost Mansion",
      desc: "Asymmetric stealth",
    },
  ];

  const roles = {
    mario_chase: [
      { id: "mario", name: "Mario", desc: "Run and escape" },
      { id: "chaser", name: "Chaser", desc: "Catch Mario" },
    ],
    ghost_mansion: [
      { id: "tracker", name: "Ghost Hunter", desc: "Hunt the ghost" },
      { id: "ghost", name: "Ghost", desc: "Faint hunters" },
    ],
  };

  function renderSelectors() {
    console.log("Rendering selectors...", state.mode, state.role);
    if (ui.modeGrid) {
      ui.modeGrid.innerHTML = "";
      modes.forEach((m) => {
        const btn = document.createElement("button");
        btn.className = `mode-card ${state.mode === m.id ? "active" : ""}`;
        btn.innerHTML = `<strong>${m.name}</strong><small>${m.desc}</small>`;
        btn.onclick = (e) => {
          e.preventDefault();
          console.log("Mode selected:", m.id);
          state.mode = m.id;
          state.role = roles[m.id][0].id;
          renderSelectors();
        };
        ui.modeGrid.appendChild(btn);
      });
    }

    if (ui.roleGrid) {
      ui.roleGrid.innerHTML = "";
      roles[state.mode].forEach((r) => {
        const btn = document.createElement("button");
        btn.className = `role-card ${state.role === r.id ? "active" : ""}`;
        btn.innerHTML = `<strong>${r.name}</strong><small>${r.desc}</small>`;
        btn.onclick = (e) => {
          e.preventDefault();
          console.log("Role selected:", r.id);
          state.role = r.id;
          renderSelectors();
        };
        ui.roleGrid.appendChild(btn);
      });
    }
  }

  if (ui.startButton) {
    ui.startButton.onclick = (e) => {
      e.preventDefault();
      audio.init(); // Initialize context on first interaction
      console.log("Start button clicked, going to Lobby");
      initLobby();
    };
  }

  if (ui.launchButton) {
    ui.launchButton.onclick = (e) => {
      e.preventDefault();
      console.log("Launch Match clicked");
      initApp();
    };
  }

  if (ui.cycleButton) {
    ui.cycleButton.onclick = (e) => {
      e.preventDefault();
      console.log("Cycle button clicked");
      const idx = modes.findIndex((m) => m.id === state.mode);
      state.mode = modes[(idx + 1) % modes.length].id;
      state.role = roles[state.mode][0].id;
      renderSelectors();
    };
  }

  if (ui.playAgainButton) {
    ui.playAgainButton.onclick = (e) => {
      e.preventDefault();
      resetState();
      initLobby();
    };
  }

  const viewReplayButton = document.getElementById("viewReplayButton");
  if (viewReplayButton) {
    viewReplayButton.onclick = (e) => {
        e.preventDefault();
        if (state.replay.recording.length > 0) {
            state.replay.currentFrame = 0;
            state.replay.isPlaying = true;
            setPhase(Phases.REPLAY);
        }
    };
  }

  // Responsive menu
  const closeMenu = () => {
    document.body.classList.remove("drawer-open");
  };
  ui.menuToggle.onclick = () => document.body.classList.toggle("drawer-open");
  ui.drawerBackdrop.onclick = closeMenu;

  renderSelectors();
}

export function updateHUD() {
  try {
    const startOverlay = document.getElementById("startOverlay");
    const lobbyControls = document.getElementById("lobbyControls");
    const resultOverlay = document.getElementById("resultOverlay");
    const countdownOverlay = document.getElementById("countdownOverlay");

    // Auto-transition to results phase if match is over
    if (state.result && (state.currentPhase === Phases.MATCH)) {
      setPhase(Phases.RESULTS);
      const resTitle = document.getElementById("resultTitle");
      const resBody = document.getElementById("resultBody");
      if (resTitle) resTitle.textContent = state.result.success ? "Victory" : "Defeat";
      if (resBody) resBody.textContent = state.result.reason;
      if (state.result.success) audio.playVictory();
      else audio.playDefeat();
    }

    if (startOverlay) startOverlay.classList.toggle("hidden", state.currentPhase !== Phases.FRONTEND);
    if (lobbyControls) lobbyControls.classList.toggle("hidden", state.currentPhase !== Phases.LOBBY);
    if (resultOverlay) resultOverlay.classList.toggle("hidden", state.currentPhase !== Phases.RESULTS);

    const modeTitleEl = document.getElementById("hudModeTitle");
    if (modeTitleEl) {
      if (state.currentPhase === Phases.REPLAY) {
        modeTitleEl.textContent = "Match Replay";
      } else if (state.currentPhase === Phases.LOBBY) {
        modeTitleEl.textContent = "Party Lobby";
      } else {
        const modeName = state.mode === "mario_chase" ? "Mario Chase" : "Luigi's Ghost Mansion";
        const roleName = state.role === "mario" ? "Mario" : state.role === "chaser" ? "Chaser" : state.role === "ghost" ? "Ghost" : "Ghost Hunter";
        modeTitleEl.textContent = `${modeName} · ${roleName}`;
      }
    }

    const timerEl = document.getElementById("hudTimer");
    if (timerEl) {
      if (state.currentPhase === Phases.LOBBY) {
        timerEl.textContent = "--:--";
      } else {
        const totalSec = Math.ceil(state.timeLeft / 1000);
        const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
        const ss = String(totalSec % 60).padStart(2, "0");
        timerEl.textContent = `${mm}:${ss}`;
      }
    }

    const player = state.world.entities.find((e) => e.id === state.playerId);
    const energyEl = document.getElementById("energyMetric");
    const scoreEl = document.getElementById("scoreMetric");
    if (player) {
      if (energyEl) {
          if (state.mode === "ghost_mansion" && player.role === "tracker") energyEl.textContent = `${Math.round(player.battery)}%`;
          else energyEl.textContent = Math.round(player.energy || 0);
      }
      if (scoreEl) scoreEl.textContent = Math.round(player.score || 0);
    }

    const stateEl = document.getElementById("stateMetric");
    if (stateEl) stateEl.textContent = state.currentPhase;

    if (countdownOverlay) {
        if (state.currentPhase === Phases.MATCH && state.countdown > 0) {
            countdownOverlay.classList.remove("hidden");
            const val = Math.ceil(state.countdown);
            countdownOverlay.textContent = val > 0 ? val : "GO!";
            countdownOverlay.style.opacity = state.countdown % 1;
        } else {
            countdownOverlay.classList.add("hidden");
        }
    }

  } catch (err) {
      console.error("HUD Error:", err);
  }
}
