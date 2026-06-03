export function setupResponsiveMenu() {
  const toggle = document.getElementById("menuToggle");
  const backdrop = document.getElementById("drawerBackdrop");
  const body = document.body;
  if (!toggle || !backdrop) return;
  const close = () => {
    body.classList.remove("drawer-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    body.classList.add("drawer-open");
    toggle.setAttribute("aria-expanded", "true");
  };
  toggle.addEventListener("click", () =>
    body.classList.contains("drawer-open") ? close() : open(),
  );
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}
