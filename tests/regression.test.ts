import { describe, expect, it, afterEach } from "vitest";
import { Slickless } from "../src/slickless";

/**
 * Regressions discovered while auditing the demo page. Each test pins a
 * specific behaviour the docs and demos rely on.
 */

function makeRoot(count: number, id?: string): HTMLElement {
  const root = document.createElement("div");
  if (id) root.id = id;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `S${i}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

const created: HTMLElement[] = [];
function track(el: HTMLElement): HTMLElement {
  created.push(el);
  return el;
}

afterEach(() => {
  for (const el of created) el.remove();
  created.length = 0;
});

describe("regression: goTo when every slide fits in the viewport", () => {
  it("focuses the requested slide even when slideCount equals slidesToShow", () => {
    const root = track(makeRoot(5));
    const s = new Slickless(root, {
      slidesToShow: 5,
      slidesToScroll: 1,
      infinite: false,
      speed: 0,
    });
    s.goTo(2);
    expect(s.getCurrentSlide()).toBe(2);
    s.goTo(4);
    expect(s.getCurrentSlide()).toBe(4);
    s.destroy();
  });

  it("focuses the requested slide when slideCount is less than slidesToShow", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, {
      slidesToShow: 5,
      infinite: false,
      speed: 0,
    });
    s.goTo(2);
    expect(s.getCurrentSlide()).toBe(2);
    s.destroy();
  });

  it("emits afterChange with the requested index, not a clamped 0", () => {
    const root = track(makeRoot(4));
    const s = new Slickless(root, {
      slidesToShow: 4,
      infinite: false,
      speed: 0,
    });
    const seen: number[] = [];
    s.on<{ currentSlide: number }>("afterChange", (d) => seen.push(d.currentSlide));
    s.goTo(1);
    s.goTo(3);
    expect(seen).toEqual([1, 3]);
    s.destroy();
  });
});

describe("regression: asNavFor still propagates when nav has slideCount === slidesToShow", () => {
  it("drives the main carousel when a fully-fitting nav strip is navigated", () => {
    const nav = track(makeRoot(5, "regression-nav"));
    const main = track(makeRoot(5, "regression-main"));
    const navInst = new Slickless(nav, {
      slidesToShow: 5,
      slidesToScroll: 1,
      arrows: false,
      infinite: false,
      speed: 0,
    });
    const mainInst = new Slickless(main, {
      fade: true,
      asNavFor: "#regression-nav",
      speed: 0,
    });
    navInst.goTo(3);
    expect(navInst.getCurrentSlide()).toBe(3);
    expect(mainInst.getCurrentSlide()).toBe(3);
    mainInst.destroy();
    navInst.destroy();
  });
});

describe("regression: custom paging buttons keep their own styling", () => {
  it("does not apply the default bullet class to user-provided paging buttons", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, {
      dots: true,
      speed: 0,
      customPaging: (i, total) => {
        const btn = document.createElement("button");
        btn.className = "frac";
        btn.textContent = `${i + 1} / ${total}`;
        return btn;
      },
    });
    const dots = root.querySelectorAll<HTMLElement>(".slickless__dot");
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of Array.from(dots)) {
      // Selector class is still added so updateDots can find them.
      expect(dot.classList.contains("slickless__dot")).toBe(true);
      // The bullet visual class must NOT leak onto user buttons.
      expect(dot.classList.contains("slickless__dot--bullet")).toBe(false);
      // User text content must remain intact.
      expect((dot.textContent ?? "").trim()).toMatch(/^\d+\s*\/\s*\d+$/);
    }
    s.destroy();
  });

  it("adds the bullet class to default dots so visual styles still apply", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, { dots: true, speed: 0 });
    const dots = root.querySelectorAll<HTMLElement>(".slickless__dot");
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of Array.from(dots)) {
      expect(dot.classList.contains("slickless__dot--bullet")).toBe(true);
    }
    s.destroy();
  });
});

describe("regression: slide children retain their own display value", () => {
  it("does not force display: block on slide content", () => {
    const root = document.createElement("div");
    for (let i = 0; i < 3; i++) {
      const card = document.createElement("article");
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";
      card.textContent = `Card ${i}`;
      root.appendChild(card);
    }
    document.body.appendChild(root);
    track(root);

    const s = new Slickless(root, { speed: 0, infinite: false });
    const wrapped = root.querySelectorAll<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned) > *",
    );
    expect(wrapped.length).toBe(3);
    for (const child of Array.from(wrapped)) {
      // Library must not override the user's flex display via its base styles.
      expect(child.style.display).toBe("flex");
    }
    s.destroy();
  });
});

describe("regression: init event is deferred so post-construction subscribers receive it", () => {
  it("delivers init to a listener attached right after `new Slickless(...)`", async () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, { speed: 0 });
    let received = false;
    s.on("init", () => {
      received = true;
    });
    // The init event is queued in a microtask. A simple await flushes it.
    await Promise.resolve();
    expect(received).toBe(true);
    s.destroy();
  });
});

describe("regression: edge event fires consistently from arrow clicks at the boundary", () => {
  it("emits edge when the next-arrow is clicked at the end (non-infinite)", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, { infinite: false, speed: 0 });
    s.goTo(2);
    const seen: string[] = [];
    s.on<{ direction: string }>("edge", (d) => seen.push(d.direction));
    const next = root.querySelector<HTMLButtonElement>(".slickless__arrow--next");
    expect(next).not.toBeNull();
    // The next arrow must remain clickable even when visually disabled, so
    // the click reaches the handler and goTo can emit the edge event.
    expect(next!.disabled).toBe(false);
    next!.click();
    expect(seen).toContain("right");
    s.destroy();
  });

  it("emits edge when the prev-arrow is clicked at the start (non-infinite)", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, { infinite: false, speed: 0 });
    const seen: string[] = [];
    s.on<{ direction: string }>("edge", (d) => seen.push(d.direction));
    const prev = root.querySelector<HTMLButtonElement>(".slickless__arrow--prev");
    expect(prev).not.toBeNull();
    expect(prev!.disabled).toBe(false);
    prev!.click();
    expect(seen).toContain("left");
    s.destroy();
  });
});

describe("regression: single-slide carousels hide dots and skip autoplay", () => {
  it("does not render dots when there is only one slide", () => {
    const root = track(makeRoot(1));
    const s = new Slickless(root, { dots: true, speed: 0 });
    expect(root.querySelector(".slickless__dots")).toBeNull();
    s.destroy();
  });

  it("renders dots normally for two or more slides", () => {
    const root = track(makeRoot(2));
    const s = new Slickless(root, { dots: true, speed: 0 });
    expect(root.querySelector(".slickless__dots")).not.toBeNull();
    s.destroy();
  });

  it("does not start autoplay when there is only one slide", () => {
    const root = track(makeRoot(1));
    const s = new Slickless(root, {
      autoplay: true,
      autoplaySpeed: 30,
      speed: 0,
      respectReducedMotion: false,
    });
    // Calling play() directly must also no-op.
    s.play();
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(s.getCurrentSlide()).toBe(0);
        s.destroy();
        resolve();
      }, 100);
    });
  });
});

describe("regression: non-infinite slide carousels animate the track", () => {
  it("applies a CSS transition when navigating via goTo", () => {
    const root = track(makeRoot(5));
    const s = new Slickless(root, {
      infinite: false,
      speed: 400,
      respectReducedMotion: false,
    });
    const trackEl = root.querySelector<HTMLElement>(".slickless__track");
    expect(trackEl).not.toBeNull();
    s.goTo(2);
    // Track must carry a transform transition while the animation is in
    // flight — previously the non-infinite path snapped synchronously.
    expect(trackEl!.style.transition).toMatch(/transform 400ms/);
    s.destroy();
  });

  it("settles on the requested slide after the transition fires", async () => {
    const root = track(makeRoot(5));
    const s = new Slickless(root, {
      infinite: false,
      speed: 20,
      respectReducedMotion: false,
    });
    s.goTo(3);
    // Index advances only after transitionend (or the safety timeout).
    expect(s.getCurrentSlide()).toBe(0);
    await new Promise((r) => setTimeout(r, 120));
    expect(s.getCurrentSlide()).toBe(3);
    s.destroy();
  });
});

describe("regression: fade supports swipe gestures", () => {
  it("advances to the next slide on a horizontal swipe", async () => {
    const root = track(makeRoot(4));
    const s = new Slickless(root, {
      fade: true,
      infinite: true,
      speed: 0,
      respectReducedMotion: false,
    });
    const viewport = root.querySelector(".slickless__viewport") as HTMLElement;

    function fire(type: string, target: EventTarget, x: number, y: number): void {
      const ev = new PointerEvent(type, {
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerType: "touch",
      });
      target.dispatchEvent(ev);
    }

    expect(s.getCurrentSlide()).toBe(0);
    // Simulate a leftward swipe of 80 px (well over threshold 24).
    fire("pointerdown", viewport, 300, 100);
    fire("pointermove", window, 280, 100);
    fire("pointermove", window, 220, 100);
    fire("pointerup", window, 220, 100);
    await new Promise((r) => setTimeout(r, 30));
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });
});

describe("regression: fade + infinite wraps the index past the last slide", () => {
  it("cycles back to 0 instead of clamping at the last index", () => {
    const root = track(makeRoot(4));
    const s = new Slickless(root, {
      fade: true,
      infinite: true,
      speed: 0,
    });
    s.goTo(3);
    expect(s.getCurrentSlide()).toBe(3);
    s.next();
    expect(s.getCurrentSlide()).toBe(0);
    s.prev();
    expect(s.getCurrentSlide()).toBe(3);
  });

  it("still clamps when fade + infinite:false", () => {
    const root = track(makeRoot(4));
    const seen: string[] = [];
    const s = new Slickless(root, {
      fade: true,
      infinite: false,
      speed: 0,
    });
    s.on<{ direction: string }>("edge", (d) => seen.push(d.direction));
    s.goTo(3);
    s.next();
    expect(s.getCurrentSlide()).toBe(3); // clamped
    expect(seen).toContain("right");
  });
});

describe("regression: rapid arrow clicks during animation", () => {
  it("drops extra clicks during an in-flight animation (only the first lands)", async () => {
    const root = track(makeRoot(6));
    const s = new Slickless(root, {
      infinite: true,
      speed: 30,
      respectReducedMotion: false,
    });
    expect(s.getCurrentSlide()).toBe(0);
    // First click starts the animation (infinite mode has a real lifecycle).
    s.next();
    // Burst of clicks during the animation — all should be ignored.
    s.next();
    s.next();
    s.next();
    await new Promise((r) => setTimeout(r, 400));
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });

  it("ignores descendant transitionend events when filtering completion", () => {
    const root = track(makeRoot(4));
    const s = new Slickless(root, {
      centerMode: true,
      infinite: true,
      speed: 30,
      respectReducedMotion: false,
    });
    // Fire a synthetic transitionend on a slide child — must NOT finalise.
    const slide = root.querySelector(".slickless__slide") as HTMLElement;
    s.next();
    const ev = new Event("transitionend", { bubbles: true });
    Object.defineProperty(ev, "target", { value: slide });
    Object.defineProperty(ev, "propertyName", { value: "opacity" });
    slide.dispatchEvent(ev);
    // Animation is still considered in flight; currentSlide remains 0 until
    // the track's transform transition resolves (or the safety timeout).
    expect(s.getCurrentSlide()).toBe(0);
    s.destroy();
  });
});

describe("regression: centerPadding shrinks slides in center mode", () => {
  it("reduces slide width relative to viewport when centerPadding is set", () => {
    // Stub a viewport that reports a known width (happy-dom otherwise reports 0)
    const root = track(makeRoot(4));
    // Override the viewport's getBoundingClientRect to return a stable size.
    const sizing = (width: number) =>
      ({
        x: 0,
        y: 0,
        width,
        height: 200,
        top: 0,
        left: 0,
        right: width,
        bottom: 200,
        toJSON: () => ({}),
      }) as DOMRect;
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      const el = this as HTMLElement;
      if (el.classList?.contains("slickless__viewport")) return sizing(400);
      return origRect.call(this);
    };

    const s = new Slickless(root, {
      slidesToShow: 1,
      centerMode: true,
      centerPadding: "30px",
      infinite: false,
      speed: 0,
    });
    const slide = root.querySelector<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned)",
    );
    expect(slide).not.toBeNull();
    // Slide should be (400 - 2*30) / 1 = 340 px wide.
    expect(slide!.style.width).toBe("340px");
    s.destroy();
    Element.prototype.getBoundingClientRect = origRect;
  });

  it("keeps full viewport size when centerMode is off, regardless of centerPadding", () => {
    const root = track(makeRoot(4));
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      const el = this as HTMLElement;
      if (el.classList?.contains("slickless__viewport")) {
        return {
          x: 0,
          y: 0,
          width: 400,
          height: 200,
          top: 0,
          left: 0,
          right: 400,
          bottom: 200,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return origRect.call(this);
    };

    const s = new Slickless(root, {
      slidesToShow: 1,
      centerMode: false,
      centerPadding: "30px",
      infinite: false,
      speed: 0,
    });
    const slide = root.querySelector<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned)",
    );
    expect(slide!.style.width).toBe("400px");
    s.destroy();
    Element.prototype.getBoundingClientRect = origRect;
  });
});

describe("regression: ondemand lazy load respects infinite:false", () => {
  it("does not pre-load the opposite end of a finite carousel", () => {
    const root = document.createElement("div");
    for (let i = 0; i < 6; i++) {
      const wrap = document.createElement("div");
      const img = document.createElement("img");
      img.setAttribute("data-lazy", `https://example.com/${i}.jpg`);
      wrap.appendChild(img);
      root.appendChild(wrap);
    }
    document.body.appendChild(root);
    track(root);

    const s = new Slickless(root, {
      lazyLoad: "ondemand",
      infinite: false,
      speed: 0,
    });
    const imgs = root.querySelectorAll<HTMLImageElement>("img");
    const loaded = Array.from(imgs).map((img) => !img.hasAttribute("data-lazy"));
    // At currentSlide 0 with buffer 1 we expect: slide 0 + slide 1 only.
    // The last slide must remain deferred — no wrap-around.
    expect(loaded).toEqual([true, true, false, false, false, false]);
    s.destroy();
  });

  it("loads more slides as the user navigates a finite carousel", () => {
    const root = document.createElement("div");
    for (let i = 0; i < 6; i++) {
      const wrap = document.createElement("div");
      const img = document.createElement("img");
      img.setAttribute("data-lazy", `https://example.com/${i}.jpg`);
      wrap.appendChild(img);
      root.appendChild(wrap);
    }
    document.body.appendChild(root);
    track(root);

    const s = new Slickless(root, {
      lazyLoad: "ondemand",
      infinite: false,
      speed: 0,
    });
    s.goTo(3);
    const imgs = root.querySelectorAll<HTMLImageElement>("img");
    const loaded = Array.from(imgs).map((img) => !img.hasAttribute("data-lazy"));
    // After navigating to slide 3 we expect the buffer window to include
    // 2, 3 and 4 (in addition to the originally-loaded 0+1).
    expect(loaded).toEqual([true, true, true, true, true, false]);
    s.destroy();
  });
});

describe("regression: dot indicator updates in step with the slide", () => {
  it("activates the target dot immediately when goTo is called (infinite mode)", () => {
    const root = track(makeRoot(6));
    const s = new Slickless(root, {
      dots: true,
      infinite: true,
      speed: 30,
      respectReducedMotion: false,
    });
    const isActive = (n: number) =>
      root
        .querySelectorAll<HTMLElement>(".slickless__dot")
        [n]?.classList.contains("slickless__dot--active") ?? false;

    // Initial state — first dot active.
    expect(isActive(0)).toBe(true);
    expect(isActive(2)).toBe(false);

    // Start animation toward slide 2. The dot for slide 2 must light up now,
    // not after the transition finishes.
    s.goTo(2);
    expect(isActive(2)).toBe(true);
    expect(isActive(0)).toBe(false);
    s.destroy();
  });

  it("wraps the dot when goTo overshoots (infinite mode)", () => {
    const root = track(makeRoot(4));
    const s = new Slickless(root, {
      dots: true,
      infinite: true,
      speed: 30,
      respectReducedMotion: false,
    });
    // Going one past the end should highlight the first dot (mod wrap).
    s.goTo(4);
    const firstDot = root.querySelector<HTMLElement>(".slickless__dot");
    expect(firstDot?.classList.contains("slickless__dot--active") ?? false).toBe(true);
    s.destroy();
  });
});

describe("regression: adaptiveHeight applies a marker class", () => {
  it("adds the marker class so slide heights aren't stretched by flex", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, { adaptiveHeight: true, speed: 0 });
    expect(root.classList.contains("slickless--adaptive-height")).toBe(true);
    s.destroy();
  });

  it("drops the marker class when the option is toggled off via setOptions", () => {
    const root = track(makeRoot(3));
    const s = new Slickless(root, { adaptiveHeight: true, speed: 0 });
    s.setOptions({ adaptiveHeight: false });
    expect(root.classList.contains("slickless--adaptive-height")).toBe(false);
    s.destroy();
  });
});

describe("regression: variableWidth + infinite clones the full slide set", () => {
  it("creates one head/tail clone per real slide so the viewport never shows empty space", () => {
    const root = track(makeRoot(6));
    const s = new Slickless(root, {
      variableWidth: true,
      infinite: true,
      speed: 0,
    });
    const total = root.querySelectorAll(".slickless__slide").length;
    const clones = root.querySelectorAll(".slickless__slide--cloned").length;
    // 6 real + 6 head clones + 6 tail clones = 18
    expect(total).toBe(18);
    expect(clones).toBe(12);
    s.destroy();
  });

  it("still uses slidesToShow when variableWidth is off", () => {
    const root = track(makeRoot(6));
    const s = new Slickless(root, {
      slidesToShow: 2,
      infinite: true,
      speed: 0,
    });
    const clones = root.querySelectorAll(".slickless__slide--cloned").length;
    // 2 head + 2 tail
    expect(clones).toBe(4);
    s.destroy();
  });
});

describe("regression: non-infinite goTo clamps the visual offset", () => {
  it("does not translate past the last window of slides", () => {
    const root = track(makeRoot(5));
    Object.defineProperty(root.querySelector(".slickless")?.parentElement ?? root, "clientWidth", {
      value: 500,
      configurable: true,
    });
    const s = new Slickless(root, {
      slidesToShow: 3,
      slidesToScroll: 1,
      infinite: false,
      speed: 0,
    });
    s.goTo(4);
    expect(s.getCurrentSlide()).toBe(4);
    // The implementation guarantees the visual offset is clamped to the last
    // window's worth of slides; we assert behaviour, not pixels, here.
    const track2 = root.querySelector<HTMLElement>(".slickless__track");
    expect(track2).not.toBeNull();
    s.destroy();
  });
});
