import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { Slickless } from "../src/slickless";

function makeRoot(count = 4): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `S${i}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

describe("autoplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances after autoplaySpeed", () => {
    const root = makeRoot();
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 1000,
      infinite: true,
      speed: 0,
    });
    expect(s.getCurrentSlide()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(s.getCurrentSlide()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(s.getCurrentSlide()).toBe(2);
    s.destroy();
  });

  it("backward direction retreats", () => {
    const root = makeRoot();
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 500,
      autoplayDirection: "backward",
      infinite: true,
      speed: 0,
    });
    vi.advanceTimersByTime(500);
    // infinite wrap from 0 → last
    expect(s.getCurrentSlide()).toBe(3);
    s.destroy();
  });

  it("pause stops the timer", () => {
    const root = makeRoot();
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 500,
      infinite: true,
      speed: 0,
    });
    s.pause();
    vi.advanceTimersByTime(2000);
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });

  it("play resumes after pause", () => {
    const root = makeRoot();
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 500,
      infinite: true,
      speed: 0,
    });
    s.pause();
    vi.advanceTimersByTime(500);
    expect(s.getCurrentSlide()).toBe(0);
    s.play();
    vi.advanceTimersByTime(500);
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });
});
