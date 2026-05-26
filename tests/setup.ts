import { beforeAll } from "vitest";

beforeAll(() => {
  // happy-dom doesn't ship a ResizeObserver shim by default in all versions.
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === "undefined") {
    class RO {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
  }

  // Make viewport calculations deterministic in jsdom-like envs that don't lay out.
  const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const rect = origGetBoundingClientRect.call(this);
    if (rect.width > 0 || rect.height > 0) return rect;
    const el = this as HTMLElement;
    if (el.classList?.contains("slickless__viewport")) {
      return {
        x: 0,
        y: 0,
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        right: 800,
        bottom: 400,
        toJSON: () => ({}),
      } as DOMRect;
    }
    if (el.classList?.contains("slickless__slide")) {
      return {
        x: 0,
        y: 0,
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        right: 800,
        bottom: 400,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return rect;
  };
});
