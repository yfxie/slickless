import { describe, expect, it, afterEach } from "vitest";
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

function makeImageRoot(count = 4): HTMLElement {
  const root = document.createElement("div");
  for (let i = 0; i < count; i++) {
    const wrap = document.createElement("div");
    const img = document.createElement("img");
    img.setAttribute("data-lazy", `https://example.com/${i}.jpg`);
    wrap.appendChild(img);
    root.appendChild(wrap);
  }
  document.body.appendChild(root);
  created.push(root);
  return root;
}

function setViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
}

function stubRootWidth(root: HTMLElement, width: number): void {
  Object.defineProperty(root, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      width,
      height: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => "",
    }),
  });
}

const baselineWidth = window.innerWidth;

afterEach(() => {
  for (const el of created) el.remove();
  created.length = 0;
  // Restore the viewport unconditionally so a failed assertion mid-test can't
  // leak a stubbed innerWidth into the next test.
  setViewport(baselineWidth);
});

describe("responsive unslick", () => {
  it("destroys the carousel when a breakpoint resolves to 'unslick'", () => {
    setViewport(1200);
    const root = makeRoot(5);
    const s = new Slickless(root, {
      slidesToShow: 1,
      speed: 0,
      responsive: [{ breakpoint: 768, settings: "unslick" }],
    });
    // Wide viewport: no breakpoint active, carousel is live.
    expect(root.classList.contains("slickless--initialized")).toBe(true);

    // Drop below the breakpoint: the unslick setting tears the carousel down.
    setViewport(500);
    stubRootWidth(root, 500);
    (s as unknown as { handleResize: () => void }).handleResize();

    expect(root.classList.contains("slickless")).toBe(false);
    expect(root.querySelector(".slickless__track")).toBeNull();
    // Original children are returned to the root.
    expect(root.children.length).toBe(5);
  });

  it("leaves the element as plain markup when 'unslick' is active at construction", () => {
    // Viewport is already below the breakpoint at construction time, so the
    // carousel must never be built — the element should stay as-is rather than
    // being half-wrapped and flagged destroyed.
    setViewport(500);
    const root = makeRoot(5);
    const s = new Slickless(root, {
      slidesToShow: 1,
      speed: 0,
      responsive: [{ breakpoint: 768, settings: "unslick" }],
    });

    expect(root.classList.contains("slickless")).toBe(false);
    expect(root.classList.contains("slickless--initialized")).toBe(false);
    expect(root.querySelector(".slickless__track")).toBeNull();
    expect(root.querySelector(".slickless__arrow")).toBeNull();
    // The original five children are untouched, not swallowed into a viewport.
    expect(root.children.length).toBe(5);
    expect(Array.from(root.children).map((c) => c.textContent)).toEqual([
      "S0",
      "S1",
      "S2",
      "S3",
      "S4",
    ]);
    void s;
  });

  it("tears down cleanly when a reInit crosses into an 'unslick' breakpoint", () => {
    // Start wide: carousel is live.
    setViewport(1200);
    const root = makeRoot(5);
    const s = new Slickless(root, {
      slidesToShow: 1,
      speed: 0,
      responsive: [{ breakpoint: 768, settings: "unslick" }],
    });
    expect(root.classList.contains("slickless--initialized")).toBe(true);

    // Viewport drops into the unslick zone, then a programmatic reInit runs
    // (e.g. via setOptions) before any resize event was processed. reInit must
    // honour the destroy and not rebuild a half-wrapped carousel.
    setViewport(500);
    s.setOptions({ slidesToShow: 2 });

    expect(root.classList.contains("slickless")).toBe(false);
    expect(root.querySelector(".slickless__track")).toBeNull();
    expect(root.children.length).toBe(5);
  });
});

describe("custom arrows", () => {
  it("clones a custom prevArrow/nextArrow element and tags it as an arrow", () => {
    const prev = document.createElement("button");
    prev.className = "my-prev";
    prev.textContent = "‹";
    const next = document.createElement("button");
    next.className = "my-next";
    next.textContent = "›";

    const root = makeRoot(5);
    const s = new Slickless(root, {
      slidesToShow: 1,
      speed: 0,
      prevArrow: prev,
      nextArrow: next,
    });
    const builtPrev = root.querySelector<HTMLElement>(".slickless__arrow--prev");
    const builtNext = root.querySelector<HTMLElement>(".slickless__arrow--next");
    expect(builtPrev?.classList.contains("my-prev")).toBe(true);
    expect(builtNext?.classList.contains("my-next")).toBe(true);
    expect(builtPrev?.getAttribute("aria-label")).toBe("Previous slide");
    // Clicking still drives navigation.
    builtNext?.click();
    expect(s.getCurrentSlide()).toBe(1);
    s.destroy();
  });

  it("parses a custom arrow provided as an HTML string", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      slidesToShow: 1,
      speed: 0,
      prevArrow: "<a class='str-prev' href='#'>prev</a>",
      nextArrow: "<a class='str-next' href='#'>next</a>",
    });
    const builtPrev = root.querySelector<HTMLElement>(".slickless__arrow--prev");
    expect(builtPrev?.classList.contains("str-prev")).toBe(true);
    // Non-button custom arrows get an explicit role.
    expect(builtPrev?.getAttribute("role")).toBe("button");
    s.destroy();
  });
});

describe("customPaging returning a string", () => {
  it("renders dots from an HTML string", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, {
      dots: true,
      speed: 0,
      customPaging: (i) => `<button class="html-dot">${i + 1}</button>`,
    });
    const dots = root.querySelectorAll<HTMLElement>(".slickless__dot");
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of Array.from(dots)) {
      expect(dot.classList.contains("html-dot")).toBe(true);
    }
    s.destroy();
  });

  it("falls back to a text button when the string has no element", () => {
    const root = makeRoot(4);
    const s = new Slickless(root, {
      dots: true,
      speed: 0,
      customPaging: (i, total) => `${i + 1} / ${total}`,
    });
    const dots = root.querySelectorAll<HTMLElement>(".slickless__dot");
    expect(dots.length).toBeGreaterThan(0);
    const first = dots[0]!;
    expect(first.tagName).toBe("BUTTON");
    expect((first.textContent ?? "").trim()).toMatch(/^1 \/ \d+$/);
    s.destroy();
  });
});

describe("variableWidth layout", () => {
  it("navigates a variableWidth + infinite carousel without error", () => {
    const root = makeRoot(6);
    const s = new Slickless(root, {
      variableWidth: true,
      infinite: true,
      speed: 0,
    });
    s.goTo(2);
    expect(s.getCurrentSlide()).toBe(2);
    s.goTo(4);
    expect(s.getCurrentSlide()).toBe(4);
    s.destroy();
  });

  it("computes a centered offset for variableWidth + centerMode", () => {
    const root = makeRoot(6);
    const s = new Slickless(root, {
      variableWidth: true,
      centerMode: true,
      infinite: false,
      speed: 0,
    });
    s.goTo(3);
    expect(s.getCurrentSlide()).toBe(3);
    const trackEl = root.querySelector<HTMLElement>(".slickless__track");
    // centerMode keeps its own offset math, so a transform is applied.
    expect(trackEl?.style.transform).toMatch(/translateX\(/);
    s.destroy();
  });
});

describe("vertical layout", () => {
  it("sizes slides by height and translates on the Y axis", () => {
    const root = makeRoot(5);
    const s = new Slickless(root, {
      vertical: true,
      infinite: false,
      speed: 0,
    });
    expect(root.classList.contains("slickless--vertical")).toBe(true);
    const slide = root.querySelector<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned)",
    );
    // Vertical mode pins width to 100% and drives height from the viewport.
    expect(slide?.style.width).toBe("100%");
    expect(slide?.style.height).toMatch(/px$/);
    s.goTo(2);
    const trackEl = root.querySelector<HTMLElement>(".slickless__track");
    expect(trackEl?.style.transform).toMatch(/translateY\(/);
    s.destroy();
  });
});

describe("progressive lazy load", () => {
  it("activates every lazy image up front", () => {
    const root = makeImageRoot(4);
    const s = new Slickless(root, {
      lazyLoad: "progressive",
      infinite: false,
      speed: 0,
    });
    const imgs = root.querySelectorAll<HTMLImageElement>("img");
    const stillDeferred = Array.from(imgs).filter((img) => img.hasAttribute("data-lazy"));
    expect(stillDeferred.length).toBe(0);
    s.destroy();
  });
});

describe("lazy load events", () => {
  it("emits lazyLoaded when an activated image finishes loading", () => {
    const root = makeImageRoot(3);
    const s = new Slickless(root, {
      lazyLoad: "progressive",
      infinite: false,
      speed: 0,
    });
    const details: Array<{ src: string }> = [];
    s.on<{ image: HTMLImageElement; src: string }>("lazyLoaded", (d) => details.push(d));
    const img = root.querySelector<HTMLImageElement>("img")!;
    img.dispatchEvent(new Event("load"));
    expect(details.length).toBe(1);
    expect(details[0]?.src).toBe("https://example.com/0.jpg");
    s.destroy();
  });

  it("emits lazyLoadError when an activated image fails to load", () => {
    const root = makeImageRoot(3);
    const s = new Slickless(root, {
      lazyLoad: "progressive",
      infinite: false,
      speed: 0,
    });
    let errored = false;
    s.on("lazyLoadError", () => (errored = true));
    const img = root.querySelector<HTMLImageElement>("img")!;
    img.dispatchEvent(new Event("error"));
    expect(errored).toBe(true);
    s.destroy();
  });
});

describe("respectReducedMotion", () => {
  it("uses an immediate (zero-duration) transition when reduced motion is preferred", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const root = makeRoot(5);
      const s = new Slickless(root, {
        infinite: false,
        speed: 400,
        respectReducedMotion: true,
      });
      // effectiveSpeed() collapses to 0, so navigation settles synchronously
      // even though speed is 400.
      s.goTo(3);
      expect(s.getCurrentSlide()).toBe(3);
      const trackEl = root.querySelector<HTMLElement>(".slickless__track");
      // No transition string is set when the duration is zero.
      expect(trackEl?.style.transition).toBe("");
      s.destroy();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

describe("active range — partial slides", () => {
  // Give the viewport and slides real dimensions so the geometric overlap test
  // has something to measure (happy-dom lays nothing out on its own).
  function withSizes(viewport: number, slide: number, fn: () => void): void {
    const sizing = (w: number) =>
      ({
        x: 0,
        y: 0,
        width: w,
        height: 400,
        top: 0,
        left: 0,
        right: w,
        bottom: 400,
        toJSON: () => ({}),
      }) as DOMRect;
    const orig = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      const el = this as HTMLElement;
      if (el.classList?.contains("slickless__viewport")) return sizing(viewport);
      if (el.classList?.contains("slickless__slide")) return sizing(slide);
      return orig.call(this);
    };
    try {
      fn();
    } finally {
      Element.prototype.getBoundingClientRect = orig;
    }
  }

  it("marks every partially-visible slide active in variableWidth mode", () => {
    withSizes(800, 200, () => {
      const root = makeRoot(6);
      const s = new Slickless(root, { variableWidth: true, infinite: false, speed: 0 });
      // 200px slides in an 800px viewport → slides 0..3 are (fully or partly)
      // visible. The old slidesToShow=1 window marked only slide 0.
      const active = root.querySelectorAll(".slickless__slide--active").length;
      expect(active).toBe(4);
      s.destroy();
    });
  });

  it("marks peeking neighbours active in centerMode", () => {
    const root = makeRoot(6);
    const s = new Slickless(root, {
      centerMode: true,
      centerPadding: "40px",
      slidesToShow: 1,
      infinite: false,
      speed: 0,
    });
    s.goTo(2);
    const slides = root.querySelectorAll<HTMLElement>(
      ".slickless__slide:not(.slickless__slide--cloned)",
    );
    // centerPadding makes slides 1 and 3 peek in beside the centered slide 2;
    // slide 0 is fully off-screen.
    expect(slides[1]?.classList.contains("slickless__slide--active")).toBe(true);
    expect(slides[2]?.classList.contains("slickless__slide--active")).toBe(true);
    expect(slides[3]?.classList.contains("slickless__slide--active")).toBe(true);
    expect(slides[0]?.classList.contains("slickless__slide--active")).toBe(false);
    s.destroy();
  });

  it("keeps partially-visible variableWidth slides interactive (not inert)", () => {
    withSizes(800, 200, () => {
      const root = makeRoot(6);
      const s = new Slickless(root, { variableWidth: true, infinite: false, speed: 0 });
      const slides = root.querySelectorAll<HTMLElement>(".slickless__slide");
      // a11y follows the same definition: a visible slide stays focusable, an
      // off-screen one is inert.
      expect(slides[2]?.hasAttribute("inert")).toBe(false);
      expect(slides[5]?.hasAttribute("inert")).toBe(true);
      s.destroy();
    });
  });

  it("still uses the slidesToShow window for plain fixed-width carousels", () => {
    const root = makeRoot(6);
    const s = new Slickless(root, { slidesToShow: 2, infinite: false, speed: 0 });
    const active = root.querySelectorAll(".slickless__slide--active").length;
    expect(active).toBe(2);
    s.destroy();
  });

  it("computes the variableWidth active range in linear time, not O(n²)", () => {
    // Count the slide/viewport measurements during a single navigation for n
    // and 2n slides. Linear work roughly doubles; the old per-slide overlap
    // test (which re-summed every slide's width for every slide) quadrupled.
    const measure = (count: number): number => {
      let calls = 0;
      const orig = Element.prototype.getBoundingClientRect;
      const sizing = (w: number) =>
        ({
          x: 0,
          y: 0,
          width: w,
          height: 400,
          top: 0,
          left: 0,
          right: w,
          bottom: 400,
          toJSON: () => ({}),
        }) as DOMRect;
      Element.prototype.getBoundingClientRect = function () {
        const el = this as HTMLElement;
        if (el.classList?.contains("slickless__viewport")) {
          calls++;
          return sizing(800);
        }
        if (el.classList?.contains("slickless__slide")) {
          calls++;
          return sizing(100);
        }
        return orig.call(this);
      };
      try {
        const root = makeRoot(count);
        const s = new Slickless(root, { variableWidth: true, infinite: false, speed: 0 });
        calls = 0; // ignore construction; measure one navigation
        s.goTo(Math.floor(count / 2), true);
        s.destroy();
        return calls;
      } finally {
        Element.prototype.getBoundingClientRect = orig;
      }
    };
    const small = measure(20);
    const large = measure(40);
    // Linear ⇒ ratio ≈ 2; quadratic ⇒ ratio ≈ 4. Allow generous slack but stay
    // clearly below the quadratic regime.
    expect(large).toBeLessThan(small * 3);
  });
});
