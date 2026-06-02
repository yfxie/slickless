import { describe, expect, it, afterEach } from "vitest";
import { Slickless } from "../src/slickless";

const created: HTMLElement[] = [];

function makeRoot(count = 4): HTMLElement {
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

afterEach(() => {
  for (const el of created) el.remove();
  created.length = 0;
});

describe("getSlideCount", () => {
  it("reports the number of real (non-clone) slides", () => {
    const s = new Slickless(makeRoot(5), { infinite: true, slidesToShow: 2, speed: 0 });
    expect(s.getSlideCount()).toBe(5);
    s.destroy();
  });
});

describe("addSlide", () => {
  it("appends a slide when no index is given", () => {
    const s = new Slickless(makeRoot(3), { infinite: false, speed: 0 });
    const extra = document.createElement("div");
    extra.textContent = "appended";
    s.addSlide(extra);
    expect(s.getSlideCount()).toBe(4);
    const last = s.getSlides()[3];
    expect(last?.textContent).toBe("appended");
    s.destroy();
  });

  it("inserts a slide at the requested index", () => {
    const s = new Slickless(makeRoot(3), { infinite: false, speed: 0 });
    const extra = document.createElement("div");
    extra.textContent = "inserted";
    s.addSlide(extra, 1);
    expect(s.getSlideCount()).toBe(4);
    expect(s.getSlides()[1]?.textContent).toBe("inserted");
    expect(s.getSlides()[2]?.textContent).toBe("S1");
    s.destroy();
  });
});

describe("removeSlide", () => {
  it("removes the slide at the given index", () => {
    const s = new Slickless(makeRoot(4), { infinite: false, speed: 0 });
    s.removeSlide(1);
    expect(s.getSlideCount()).toBe(3);
    const texts = s.getSlides().map((el) => el.textContent);
    expect(texts).toEqual(["S0", "S2", "S3"]);
    s.destroy();
  });

  it("ignores out-of-range indices", () => {
    const s = new Slickless(makeRoot(3), { infinite: false, speed: 0 });
    s.removeSlide(-1);
    s.removeSlide(99);
    expect(s.getSlideCount()).toBe(3);
    s.destroy();
  });
});

describe("refresh", () => {
  it("re-applies layout without tearing down the DOM", () => {
    const s = new Slickless(makeRoot(4), { infinite: false, speed: 0 });
    const trackBefore = s.getSlides()[0]?.parentElement;
    s.refresh();
    // refresh() must not rebuild — the track element stays the same node.
    expect(s.getSlides()[0]?.parentElement).toBe(trackBefore);
    expect(s.getSlideCount()).toBe(4);
    s.destroy();
  });

  it("is a no-op after destroy", () => {
    const s = new Slickless(makeRoot(3), { speed: 0 });
    s.destroy();
    // Should not throw even though the instance is torn down.
    expect(() => s.refresh()).not.toThrow();
  });
});

describe("setOptions", () => {
  it("updates options without rebuilding when refresh is false", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, { slidesToShow: 1, speed: 0 });
    const trackBefore = root.querySelector(".slickless__track");
    s.setOptions({ cssEase: "linear" }, false);
    expect(s.options.cssEase).toBe("linear");
    // No reInit means the original track node is still in place.
    expect(root.querySelector(".slickless__track")).toBe(trackBefore);
    s.destroy();
  });

  it("rebuilds when refresh defaults to true", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, { slidesToShow: 1, speed: 0 });
    const trackBefore = root.querySelector(".slickless__track");
    s.setOptions({ slidesToShow: 2 });
    expect(s.options.slidesToShow).toBe(2);
    // reInit replaces the track with a freshly built one.
    expect(root.querySelector(".slickless__track")).not.toBe(trackBefore);
    s.destroy();
  });
});

describe("off", () => {
  it("removes a previously registered listener", () => {
    const s = new Slickless(makeRoot(4), { infinite: false, speed: 0 });
    const calls: number[] = [];
    const handler = (d: unknown) => calls.push((d as { currentSlide: number }).currentSlide);
    s.on("afterChange", handler);
    s.next();
    s.off("afterChange", handler);
    s.next();
    // Only the first navigation should have been observed.
    expect(calls).toEqual([1]);
    s.destroy();
  });

  it("the on() return value also unsubscribes", () => {
    const s = new Slickless(makeRoot(4), { infinite: false, speed: 0 });
    const calls: number[] = [];
    const unsubscribe = s.on("afterChange", (d) =>
      calls.push((d as { currentSlide: number }).currentSlide),
    );
    s.next();
    unsubscribe();
    s.next();
    expect(calls).toEqual([1]);
    s.destroy();
  });
});
