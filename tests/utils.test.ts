import { describe, expect, it, afterEach } from "vitest";
import {
  clamp,
  ensureNumber,
  mod,
  nextFrame,
  resolveElement,
} from "../src/utils";

describe("clamp", () => {
  it("returns the value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below the minimum and above the maximum", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("mod", () => {
  it("wraps negative numbers into the positive range", () => {
    expect(mod(-1, 5)).toBe(4);
    expect(mod(6, 5)).toBe(1);
    expect(mod(0, 5)).toBe(0);
  });
});

describe("ensureNumber", () => {
  it("returns numeric input unchanged", () => {
    expect(ensureNumber(5, 0)).toBe(5);
    expect(ensureNumber(0, 9)).toBe(0);
  });

  it("coerces numeric strings", () => {
    expect(ensureNumber("3", 0)).toBe(3);
    expect(ensureNumber("2.5", 0)).toBe(2.5);
  });

  it("falls back when the value is not a finite number", () => {
    expect(ensureNumber("abc", 7)).toBe(7);
    expect(ensureNumber(undefined, 9)).toBe(9);
    expect(ensureNumber(NaN, 1)).toBe(1);
    expect(ensureNumber(Infinity, 2)).toBe(2);
  });

  it("coerces null to 0 via Number() rather than using the fallback", () => {
    // Documents the (slightly surprising) Number(null) === 0 path: null is a
    // finite coercion, so the fallback is intentionally not used.
    expect(ensureNumber(null, 4)).toBe(0);
  });
});

describe("resolveElement", () => {
  const created: HTMLElement[] = [];
  afterEach(() => {
    for (const el of created) el.remove();
    created.length = 0;
  });

  it("returns null for empty input", () => {
    expect(resolveElement(null)).toBeNull();
    expect(resolveElement("")).toBeNull();
  });

  it("resolves a string selector against the document", () => {
    const el = document.createElement("div");
    el.id = "resolve-target";
    document.body.appendChild(el);
    created.push(el);
    expect(resolveElement("#resolve-target")).toBe(el);
    expect(resolveElement("#does-not-exist")).toBeNull();
  });

  it("passes an HTMLElement straight through", () => {
    const el = document.createElement("section");
    expect(resolveElement(el)).toBe(el);
  });
});

describe("nextFrame", () => {
  it("resolves via requestAnimationFrame when available", async () => {
    await expect(nextFrame()).resolves.toBeUndefined();
  });

  it("falls back to setTimeout when requestAnimationFrame is absent", async () => {
    const original = globalThis.requestAnimationFrame;
    // Force the setTimeout branch by removing the rAF global.
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame =
      undefined;
    try {
      await expect(nextFrame()).resolves.toBeUndefined();
    } finally {
      globalThis.requestAnimationFrame = original;
    }
  });
});
