import { initApp } from "./app.js";
import { setupResponsiveMenu } from "./ui.js";
import { state } from "./game-state.js";
import { render } from "./render.js";

window.NL = state;
setupResponsiveMenu();
initApp();
requestAnimationFrame(function loop() {
  render();
  requestAnimationFrame(loop);
});
