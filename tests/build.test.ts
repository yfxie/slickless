import { describe, expect, it } from "vitest";
import { Slickless } from "../src/slickless";

function makeRoot(count = 4): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `Slide ${i + 1}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

describe("DOM build", () => {
  it("adds slickless class and ARIA attributes", () => {
    const root = makeRoot();
    const s = new Slickless(root);
    expect(root.classList.contains("slickless")).toBe(true);
    expect(root.classList.contains("slickless--initialized")).toBe(true);
    expect(root.getAttribute("role")).toBe("region");
    expect(root.getAttribute("aria-roledescription")).toBe("carousel");
    s.destroy();
  });

  it("wraps each child as a slide", () => {
    const root = makeRoot(3);
    const s = new Slickless(root);
    const slides = root.querySelectorAll(".slickless__slide:not(.slickless__slide--cloned)");
    expect(slides.length).toBe(3);
    s.destroy();
  });

  it("produces head/tail clones when infinite", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { slidesToShow: 2, infinite: true });
    const clones = root.querySelectorAll(".slickless__slide--cloned");
    expect(clones.length).toBe(4); // 2 head + 2 tail
    s.destroy();
  });

  it("does not produce clones when fade is enabled", () => {
    const root = makeRoot(3);
    const s = new Slickless(root, { fade: true });
    const clones = root.querySelectorAll(".slickless__slide--cloned");
    expect(clones.length).toBe(0);
    expect(root.classList.contains("slickless--fade")).toBe(true);
    s.destroy();
  });

  it("renders dots when enabled", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, { dots: true });
    const dots = root.querySelectorAll(".slickless__dot");
    expect(dots.length).toBe(4);
    s.destroy();
  });

  it("hides arrows when slides fit in view", () => {
    const root = makeRoot(2);
    const s = new Slickless(root, { slidesToShow: 2 });
    const prev = root.querySelector(".slickless__arrow--prev");
    expect(prev).toBeNull();
    s.destroy();
  });

  it("destroy returns the original DOM", () => {
    const root = makeRoot(3);
    const html = root.innerHTML;
    const s = new Slickless(root);
    s.destroy();
    expect(root.classList.contains("slickless")).toBe(false);
    expect(root.children.length).toBe(3);
    // Each original child returned (text content preserved)
    const texts = Array.from(root.children).map((c) => (c as HTMLElement).textContent);
    expect(texts).toEqual(["Slide 1", "Slide 2", "Slide 3"]);
    expect(html.length).toBeGreaterThan(0);
  });
});
