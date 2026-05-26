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
});
