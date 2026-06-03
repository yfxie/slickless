import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { Slickless } from "../src/slickless";

const created: HTMLElement[] = [];

function makeRoot(count = 5): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `S${i}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  created.push(root);
  return root;
}

function key(root: HTMLElement, k: string): void {
  root.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

function pointer(type: string, target: EventTarget, x: number, y: number): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      pointerType: "touch",
    }),
  );
}

afterEach(() => {
  for (const el of created) el.remove();
  created.length = 0;
});

describe("focusOnSelect", () => {
  it("navigates to a slide when it is clicked", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      focusOnSelect: true,
      infinite: false,
      speed: 0,
    });
    const slides = root.querySelectorAll<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned)",
    );
    slides[3]?.click();
    expect(s.getCurrentSlide()).toBe(3);
    s.destroy();
  });
});

describe("keyboard navigation", () => {
  it("advances and retreats with arrow keys", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { infinite: false, speed: 0 });
    key(root, "ArrowRight");
    expect(s.getCurrentSlide()).toBe(1);
    key(root, "ArrowRight");
    expect(s.getCurrentSlide()).toBe(2);
    key(root, "ArrowLeft");
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });

  it("jumps to the first and last slide with Home and End", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { infinite: false, speed: 0 });
    key(root, "End");
    expect(s.getCurrentSlide()).toBe(4);
    key(root, "Home");
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });

  it("reverses arrow direction in rtl mode", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { infinite: false, rtl: true, speed: 0 });
    key(root, "ArrowLeft");
    expect(s.getCurrentSlide()).toBe(1);
    key(root, "ArrowRight");
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });

  it("ignores keys when accessibility is disabled", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { infinite: false, accessibility: false, speed: 0 });
    key(root, "ArrowRight");
    key(root, "End");
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });
});

describe("pauseOnHover", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pauses autoplay on mouseenter and resumes on mouseleave", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 500,
      pauseOnHover: true,
      infinite: true,
      speed: 0,
      respectReducedMotion: false,
    });
    root.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(2000);
    expect(s.getCurrentSlide()).toBe(0);
    root.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(500);
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });
});

describe("pauseOnFocus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pauses on focusin and resumes only when focus leaves the root", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 500,
      pauseOnFocus: true,
      infinite: true,
      speed: 0,
      respectReducedMotion: false,
    });
    const inside = root.querySelector(".slickless__slide") as HTMLElement;

    root.dispatchEvent(new FocusEvent("focusin"));
    vi.advanceTimersByTime(2000);
    expect(s.getCurrentSlide()).toBe(0);

    // Focus moving to another element still inside the root must NOT resume.
    root.dispatchEvent(new FocusEvent("focusout", { relatedTarget: inside }));
    vi.advanceTimersByTime(2000);
    expect(s.getCurrentSlide()).toBe(0);

    // Focus leaving the root entirely resumes autoplay.
    root.dispatchEvent(new FocusEvent("focusout", { relatedTarget: document.body }));
    vi.advanceTimersByTime(500);
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });
});

describe("pointer drag", () => {
  it("emits a swipe event and advances on a leftward drag (slide mode)", async () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: true,
      draggable: true,
      speed: 0,
      respectReducedMotion: false,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    let direction = "";
    s.on<{ direction: string }>("swipe", (d) => (direction = d.direction));

    pointer("pointerdown", viewport, 300, 100);
    pointer("pointermove", window, 260, 100);
    pointer("pointermove", window, 200, 100);
    pointer("pointerup", window, 200, 100);
    await new Promise((r) => setTimeout(r, 10));

    expect(direction).toBe("left");
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });

  it("emits a swipe event and retreats on a rightward drag (slide mode)", async () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: true,
      draggable: true,
      speed: 0,
      respectReducedMotion: false,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    let direction = "";
    s.on<{ direction: string }>("swipe", (d) => (direction = d.direction));

    pointer("pointerdown", viewport, 200, 100);
    pointer("pointermove", window, 240, 100);
    pointer("pointermove", window, 300, 100);
    pointer("pointerup", window, 300, 100);
    await new Promise((r) => setTimeout(r, 10));

    expect(direction).toBe("right");
    expect(s.getCurrentSlide()).toBe(4);
    s.destroy();
  });

  it("aborts the gesture when a horizontal carousel is dragged vertically", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: true,
      draggable: true,
      speed: 0,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    pointer("pointerdown", viewport, 300, 100);
    // Mostly-vertical movement: the axis lock decides this is a scroll, not a
    // swipe, drops out of dragging, and never navigates.
    pointer("pointermove", window, 305, 180);
    expect(root.classList.contains("slickless--dragging")).toBe(false);
    pointer("pointerup", window, 305, 180);
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });

  it("clears the dragging state when a pointercancel arrives", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: true,
      draggable: true,
      speed: 0,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    pointer("pointerdown", viewport, 300, 100);
    expect(root.classList.contains("slickless--dragging")).toBe(true);
    pointer("pointercancel", window, 300, 100);
    expect(root.classList.contains("slickless--dragging")).toBe(false);
    s.destroy();
  });

  it("snaps back without navigating for a slow drag under the threshold", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: false,
      draggable: true,
      swipeThreshold: 100,
      speed: 0,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    // A fast flick swipes on velocity even under the distance threshold, so
    // force a low velocity by advancing a controllable clock between the
    // pointerdown (startTime) and the pointerup (elapsed).
    const origNow = performance.now;
    let clock = 0;
    (performance as { now: () => number }).now = () => clock;
    try {
      pointer("pointerdown", viewport, 300, 100); // startTime captured at 0
      pointer("pointermove", window, 290, 100);
      clock = 1000; // 10px over 1000ms → velocity 0.01, well under 0.6
      pointer("pointerup", window, 290, 100);
      expect(s.getCurrentSlide()).toBe(0);
    } finally {
      (performance as { now: () => number }).now = origNow;
    }
    s.destroy();
  });
});

describe("no-op navigation", () => {
  it("does not emit change events on a plain click (no drag)", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { infinite: false, draggable: true, speed: 0 });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    let before = 0;
    let after = 0;
    s.on("beforeChange", () => before++);
    s.on("afterChange", () => after++);

    // A plain click is pointerdown + pointerup at the same spot with no move.
    // It must not register as a slide change.
    pointer("pointerdown", viewport, 300, 100);
    pointer("pointerup", window, 300, 100);

    expect(before).toBe(0);
    expect(after).toBe(0);
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });

  it("snaps the track home when an over-threshold drag is blocked at the first slide", async () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: false,
      draggable: true,
      swipeThreshold: 30,
      speed: 0,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    const track = root.querySelector(".slickless__track") as HTMLElement;
    const rest = track.style.transform;
    let before = 0;
    let after = 0;
    let edge = 0;
    s.on("beforeChange", () => before++);
    s.on("afterChange", () => after++);
    s.on("edge", () => edge++);

    // Drag forward (toward prev) at the first slide. There's nothing before it,
    // so navigation is blocked — but the finger-dragged track must still return
    // to rest instead of staying stuck mid-drag.
    pointer("pointerdown", viewport, 100, 100);
    pointer("pointermove", window, 170, 100);
    pointer("pointermove", window, 220, 100); // 120px → over threshold → swipe
    pointer("pointerup", window, 220, 100);
    await new Promise((r) => setTimeout(r, 10));

    expect(s.getCurrentSlide()).toBe(0);
    expect(track.style.transform).toBe(rest);
    // A blocked boundary swipe is a no-op navigation: it reports the edge but
    // must not emit change events.
    expect(edge).toBe(1);
    expect(before).toBe(0);
    expect(after).toBe(0);
    s.destroy();
  });

  it("snaps the track home when an over-threshold drag is blocked at the last slide", async () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: false,
      draggable: true,
      swipeThreshold: 30,
      speed: 0,
    });
    s.goTo(4);
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    const track = root.querySelector(".slickless__track") as HTMLElement;
    const rest = track.style.transform;
    let before = 0;
    let after = 0;
    let edge = 0;
    s.on("beforeChange", () => before++);
    s.on("afterChange", () => after++);
    s.on("edge", () => edge++);

    // Drag backward (toward next) at the last slide — blocked, but must snap back.
    pointer("pointerdown", viewport, 220, 100);
    pointer("pointermove", window, 150, 100);
    pointer("pointermove", window, 100, 100);
    pointer("pointerup", window, 100, 100);
    await new Promise((r) => setTimeout(r, 10));

    expect(s.getCurrentSlide()).toBe(4);
    expect(track.style.transform).toBe(rest);
    expect(edge).toBe(1);
    expect(before).toBe(0);
    expect(after).toBe(0);
    s.destroy();
  });

  it("snaps the track back to rest without emitting change events for a sub-threshold drag", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      infinite: false,
      draggable: true,
      swipeThreshold: 100,
      speed: 0,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;
    const track = root.querySelector(".slickless__track") as HTMLElement;
    let before = 0;
    s.on("beforeChange", () => before++);
    const restTransform = track.style.transform;

    const origNow = performance.now;
    let clock = 0;
    (performance as { now: () => number }).now = () => clock;
    try {
      pointer("pointerdown", viewport, 300, 100);
      pointer("pointermove", window, 280, 100); // 20px drag moves the track
      clock = 1000; // low velocity → not a swipe
      pointer("pointerup", window, 280, 100);
    } finally {
      (performance as { now: () => number }).now = origNow;
    }

    expect(before).toBe(0); // no spurious navigation event
    expect(s.getCurrentSlide()).toBe(0);
    // The dragged track must still return to its resting offset — the fix must
    // reset the transform, not just skip the event.
    expect(track.style.transform).toBe(restTransform);
    s.destroy();
  });

  it("fires edge but no change events when advancing past the last finite slide", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { infinite: false, speed: 0 });
    s.goTo(4); // park on the last slide before attaching listeners
    let edge = 0;
    let before = 0;
    let after = 0;
    s.on("edge", () => edge++);
    s.on("beforeChange", () => before++);
    s.on("afterChange", () => after++);

    // Already at the end — next() clamps back to the same index, so it should
    // report the edge but not a slide change.
    s.next();

    expect(edge).toBe(1);
    expect(before).toBe(0);
    expect(after).toBe(0);
    expect(s.getCurrentSlide()).toBe(4);
    s.destroy();
  });

  it("does not emit change events when focusOnSelect re-clicks the active slide", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, { focusOnSelect: true, infinite: false, speed: 0 });
    const slides = root.querySelectorAll<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned)",
    );
    let before = 0;
    let after = 0;
    s.on("beforeChange", () => before++);
    s.on("afterChange", () => after++);

    // Slide 0 is already the active slide; clicking it changes nothing.
    slides[0]?.click();

    expect(before).toBe(0);
    expect(after).toBe(0);
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });
});
