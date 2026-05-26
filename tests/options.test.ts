import { describe, expect, it } from "vitest";
import { DEFAULTS } from "../src/defaults";
import { Slickless } from "../src/slickless";

function makeRoot(count = 5): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `Slide ${i + 1}`;
    s.setAttribute("data-i", String(i));
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

describe("options", () => {
  it("uses defaults when none provided", () => {
    const root = makeRoot(3);
    const s = new Slickless(root);
    expect(s.options.slidesToShow).toBe(DEFAULTS.slidesToShow);
    expect(s.options.infinite).toBe(true);
    s.destroy();
  });

  it("merges user options over defaults", () => {
    const root = makeRoot();
    const s = new Slickless(root, { slidesToShow: 3, autoplay: true });
    expect(s.options.slidesToShow).toBe(3);
    expect(s.options.autoplay).toBe(true);
    expect(s.options.infinite).toBe(DEFAULTS.infinite);
    s.destroy();
  });

  it("setOptions updates and refreshes", () => {
    const root = makeRoot();
    const s = new Slickless(root, { slidesToShow: 1 });
    s.setOptions({ slidesToShow: 2 });
    expect(s.options.slidesToShow).toBe(2);
    s.destroy();
  });
});
