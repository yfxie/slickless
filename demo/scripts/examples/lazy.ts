import { Slickless } from "slickless";

type LazyMode = "ondemand" | "progressive" | "off";
type LazyOpt = "ondemand" | "progressive" | false;

function lazyOptionFor(mode: LazyMode): LazyOpt {
  return mode === "off" ? false : mode;
}

function refreshCount(root: HTMLElement, counter: HTMLElement | null): void {
  const loaded = root.querySelectorAll("img.is-loaded").length;
  if (counter) counter.textContent = String(loaded);
}

function captureOriginalSrcs(root: HTMLElement): Map<HTMLImageElement, string> {
  const map = new Map<HTMLImageElement, string>();
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.getAttribute("data-lazy") ?? img.getAttribute("src") ?? "";
    if (src) map.set(img, src);
  });
  return map;
}

export function initLazy(): void {
  const root = document.querySelector<HTMLElement>("#lazy-carousel");
  if (!root) return;
  const counter = document.querySelector<HTMLElement>("#lazy-count");

  const originalSrcs = captureOriginalSrcs(root);
  let mode: LazyMode = "ondemand";
  let instance: Slickless | null = null;

  function attach(slickless: Slickless): void {
    slickless.on<{ image: HTMLImageElement }>("lazyLoaded", (d) => {
      d.image.classList.add("is-loaded");
      if (root) refreshCount(root, counter);
    });
  }

  function build(): void {
    if (!root) return;
    if (instance) instance.destroy();
    // Restore each <img> to its original data-lazy state so we can demo the
    // load behaviour again after a mode switch or a reset click.
    root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const original = originalSrcs.get(img);
      if (original) {
        img.setAttribute("data-lazy", original);
        img.removeAttribute("src");
      }
      img.classList.remove("is-loaded");
    });
    instance = new Slickless(root, {
      lazyLoad: lazyOptionFor(mode),
      dots: true,
      infinite: false,
    });
    attach(instance);
    refreshCount(root, counter);
  }

  build();

  document.querySelectorAll<HTMLInputElement>('input[name="lazy-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      mode = radio.value as LazyMode;
      build();
    });
  });
  document.querySelector<HTMLButtonElement>("#lazy-reset")?.addEventListener("click", () => {
    build();
  });
}
