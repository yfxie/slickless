import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Slickless } from "../src/slickless";

function makeRoot(count = 6): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `S${i}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

function setViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
}

let originalWidth: number;

beforeEach(() => {
  originalWidth = window.innerWidth;
});
afterEach(() => {
  setViewport(originalWidth);
});

describe("responsive", () => {
  it("applies a matching breakpoint at construction time", () => {
    setViewport(500);
    const root = makeRoot();
    const s = new Slickless(root, {
      slidesToShow: 4,
      responsive: [
        { breakpoint: 768, settings: { slidesToShow: 2 } },
        { breakpoint: 480, settings: { slidesToShow: 1 } },
      ],
    });
    expect(s.options.slidesToShow).toBe(2);
    s.destroy();
  });

  it("uses base settings when no breakpoint matches", () => {
    setViewport(1200);
    const root = makeRoot();
    const s = new Slickless(root, {
      slidesToShow: 4,
      responsive: [{ breakpoint: 768, settings: { slidesToShow: 2 } }],
    });
    expect(s.options.slidesToShow).toBe(4);
    s.destroy();
  });

  it("rebuilds dots when a breakpoint switch exits all-fit territory", () => {
    // Wide viewport: base config shows all 3 slides at once → no dots needed.
    setViewport(1200);
    const root = makeRoot(3);
    const s = new Slickless(root, {
      slidesToShow: 3,
      dots: true,
      responsive: [{ breakpoint: 768, settings: { slidesToShow: 1 } }],
    });
    expect(root.querySelector(".slickless__dots")).toBeNull();

    // Narrow viewport: slidesToShow drops to 1 → dots are now meaningful and
    // must appear. happy-dom doesn't fire ResizeObserver from setViewport
    // alone, so invoke the internal resize handler directly.
    setViewport(500);
    Object.defineProperty(root, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 500, height: 0, top: 0, left: 0, right: 500, bottom: 0, x: 0, y: 0, toJSON: () => "" }),
    });
    (s as unknown as { handleResize: () => void }).handleResize();

    expect(root.querySelector(".slickless__dots")).not.toBeNull();
    expect(root.querySelectorAll(".slickless__dot--bullet").length).toBe(3);
    s.destroy();
  });
});
