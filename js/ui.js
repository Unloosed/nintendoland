import { state, resetState, setPhase, Phases } from "./game-state.js";
import { initApp, initLobby } from "./app.js";

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
      console.log("Start button clicked, going to Lobby");
      if (ui.startOverlay) ui.startOverlay.classList.add("hidden");
      initLobby();
      if (ui.lobbyControls) ui.lobbyControls.classList.remove("hidden");
    };
  }

  if (ui.launchButton) {
    ui.launchButton.onclick = (e) => {
      e.preventDefault();
      console.log("Launch Match clicked");
      initApp();
      if (ui.lobbyControls) ui.lobbyControls.classList.add("hidden");
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
      if (ui.resultOverlay) ui.resultOverlay.classList.add("hidden");
      resetState();
      initLobby();
      if (ui.lobbyControls) ui.lobbyControls.classList.remove("hidden");
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
  const modeTitleEl = document.getElementById("hudModeTitle");
  if (modeTitleEl) {
    if (state.currentPhase === Phases.LOBBY) {
      modeTitleEl.textContent = "Party Lobby";
    } else {
      const modeName =
        state.mode === "mario_chase" ? "Mario Chase" : "Luigi's Ghost Mansion";
      const roleName =
        state.role === "mario"
          ? "Mario"
          : state.role === "chaser"
            ? "Chaser"
            : state.role === "ghost"
              ? "Ghost"
              : "Ghost Hunter";
      modeTitleEl.textContent = `${modeName} · ${roleName}`;
    }
  }

  const timerEl = document.getElementById("hudTimer");
  const energyEl = document.getElementById("energyMetric");
  const scoreEl = document.getElementById("scoreMetric");
  const stateEl = document.getElementById("stateMetric");
  const resultOverlay = document.getElementById("resultOverlay");

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
  if (player) {
    if (state.mode === "ghost_mansion" && player.role === "tracker") {
      energyEl.textContent = `${Math.round(player.battery)}%`;
    } else {
      energyEl.textContent = Math.round(player.energy || 0);
    }
    scoreEl.textContent = Math.round(player.score || 0);
  } else {
    energyEl.textContent = "0";
    scoreEl.textContent = "0";
  }

  stateEl.textContent = state.currentPhase;

  if (state.result && resultOverlay.classList.contains("hidden")) {
    setPhase(Phases.RESULTS);
    document.getElementById("resultTitle").textContent = state.result.success
      ? "Victory"
      : "Defeat";

    let stats = state.result.reason;
    if (state.mode === "mario_chase") {
      const survived = Math.floor((120000 - state.timeLeft) / 1000);
      stats += `<br><br>Time Survived: ${survived}s`;
      if (state.timeLeft > 0 && !state.result.success && state.role === "mario") {
         stats += "<br>Captured!";
      }
    }

    document.getElementById("resultBody").innerHTML = stats;
    resultOverlay.classList.remove("hidden");
  }
}
