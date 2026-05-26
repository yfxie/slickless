import { Slickless } from "slickless";

export function initVarwidth(): void {
  const varwidth = new Slickless("#varwidth-carousel", {
    variableWidth: true,
    slidesToScroll: 1,
    infinite: true,
    speed: 350,
  });
  const toggle = document.querySelector<HTMLInputElement>("#varwidth-toggle");
  const state = document.querySelector<HTMLElement>("#varwidth-state");
  toggle?.addEventListener("change", () => {
    const on = toggle.checked;
    varwidth.setOptions({ variableWidth: on });
    if (state) state.textContent = on ? "on" : "off";
  });
}
