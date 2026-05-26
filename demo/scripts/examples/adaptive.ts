import { Slickless } from "slickless";

export function initAdaptive(): void {
  const adaptive = new Slickless("#adaptive-carousel", {
    adaptiveHeight: true,
    dots: true,
    infinite: true,
    speed: 450,
  });
  const toggle = document.querySelector<HTMLInputElement>("#adaptive-toggle");
  const state = document.querySelector<HTMLElement>("#adaptive-state");
  toggle?.addEventListener("change", () => {
    const on = toggle.checked;
    adaptive.setOptions({ adaptiveHeight: on });
    if (state) state.textContent = on ? "on" : "off";
  });
}
