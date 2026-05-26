import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Slickless } from "../src/slickless";

function makeRoot(count = 5): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `Slide ${i + 1}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

let root: HTMLElement;

beforeEach(() => {
  root = makeRoot(5);
});

afterEach(() => {
  root.remove();
});

describe("navigation", () => {
  it("next/prev advance and retreat the current slide", () => {
    const s = new Slickless(root, { infinite: false, speed: 0 });
    expect(s.getCurrentSlide()).toBe(0);
    s.next();
    expect(s.getCurrentSlide()).toBe(1);
    s.next();
    expect(s.getCurrentSlide()).toBe(2);
    s.prev();
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });

  it("goTo respects an explicit index", () => {
    const s = new Slickless(root, { infinite: false, speed: 0 });
    s.goTo(3);
    expect(s.getCurrentSlide()).toBe(3);
    s.destroy();
  });

  it("clamps on edges when not infinite", () => {
    const s = new Slickless(root, { infinite: false, speed: 0 });
    s.prev();
    expect(s.getCurrentSlide()).toBe(0);
    s.goTo(99);
    expect(s.getCurrentSlide()).toBe(4);
    s.destroy();
  });

  it("wraps when infinite", () => {
    const s = new Slickless(root, { infinite: true, speed: 0 });
    s.prev();
    expect(s.getCurrentSlide()).toBe(4);
    s.next();
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });

  it("emits beforeChange and afterChange", () => {
    const s = new Slickless(root, { infinite: false, speed: 0 });
    const before: number[] = [];
    const after: number[] = [];
    s.on<{ nextSlide: number }>("beforeChange", (d) => before.push(d.nextSlide));
    s.on<{ currentSlide: number }>("afterChange", (d) => after.push(d.currentSlide));
    s.next();
    s.next();
    expect(before).toEqual([1, 2]);
    expect(after).toEqual([1, 2]);
    s.destroy();
  });

  it("getSlides returns the original slides only (no clones)", () => {
    const s = new Slickless(root, { infinite: true, slidesToShow: 2, speed: 0 });
    expect(s.getSlides().length).toBe(5);
    s.destroy();
  });

  it("initialSlide positions the carousel", () => {
    const s = new Slickless(root, { initialSlide: 2, infinite: false, speed: 0 });
    expect(s.getCurrentSlide()).toBe(2);
    s.destroy();
  });
});
