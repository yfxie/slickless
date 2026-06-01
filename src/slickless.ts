import { DEFAULTS, mergeOptions } from "./defaults";
import type {
  AfterChangeDetail,
  BeforeChangeDetail,
  BreakpointDetail,
  EdgeDetail,
  LazyLoadDetail,
  ResponsiveBreakpoint,
  SlicklessOptions,
  SwipeDetail,
} from "./types";
import { clamp, createEl, mod, prefersReducedMotion, resolveElement } from "./utils";

interface Pointer {
  id: number;
  startX: number;
  startY: number;
  startTime: number;
  startTransform: number;
  active: boolean;
  decided: boolean;
  isHorizontal: boolean;
}

const CLASS = {
  root: "slickless",
  initialized: "slickless--initialized",
  viewport: "slickless__viewport",
  track: "slickless__track",
  slide: "slickless__slide",
  slideActive: "slickless__slide--active",
  slideCenter: "slickless__slide--center",
  slideCloned: "slickless__slide--cloned",
  slideCurrent: "slickless__slide--current",
  arrow: "slickless__arrow",
  arrowPrev: "slickless__arrow--prev",
  arrowNext: "slickless__arrow--next",
  arrowDisabled: "slickless__arrow--disabled",
  dots: "slickless__dots",
  dot: "slickless__dot",
  dotBullet: "slickless__dot--bullet",
  dotActive: "slickless__dot--active",
  vertical: "slickless--vertical",
  fade: "slickless--fade",
  rtl: "slickless--rtl",
  dragging: "slickless--dragging",
  centerMode: "slickless--center",
  adaptive: "slickless--adaptive-height",
};

export class Slickless {
  readonly root: HTMLElement;
  private userOptions: Partial<SlicklessOptions>;
  options: SlicklessOptions;

  private originalChildren: HTMLElement[] = [];
  private slides: HTMLElement[] = [];
  private track!: HTMLElement;
  private viewport!: HTMLElement;
  private prevArrow: HTMLElement | null = null;
  private nextArrow: HTMLElement | null = null;
  private dotsList: HTMLElement | null = null;
  private cloneCount = 0;

  private currentIndex = 0;
  /** Track index we are animating toward. Lets layout reads use the future
   * slide for height-syncing while the transform is still in flight. */
  private animatingTo: number | null = null;
  private slideCount = 0;
  private animating = false;
  /** Last observed root width — used to ignore height-only ResizeObserver
   * fires (e.g. when adaptiveHeight changes the viewport height). */
  private lastRootWidth = 0;
  private destroyed = false;
  private currentBreakpoint: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private autoplayTimer: ReturnType<typeof setTimeout> | null = null;
  private autoplayPaused = false;
  private listeners: Map<string, Set<(detail: unknown) => void>> = new Map();
  private pointer: Pointer | null = null;
  private pointerHandlers: {
    down?: (e: Event) => void;
    move?: (e: Event) => void;
    up?: (e: Event) => void;
    cancel?: (e: Event) => void;
  } = {};
  private linkedNav: Slickless | null = null;
  private linkedFromExternal = false;

  constructor(root: string | HTMLElement, options: Partial<SlicklessOptions> = {}) {
    const el = typeof root === "string" ? document.querySelector<HTMLElement>(root) : root;
    if (!el) throw new Error(`[slickless] Root element not found: ${String(root)}`);
    this.root = el;
    this.userOptions = options;
    this.options = mergeOptions(DEFAULTS, options);
    this.init();
  }

  private init(): void {
    this.captureChildren();
    this.applyResponsive();
    this.build();
    this.bindEvents();
    this.goTo(this.options.initialSlide, true);
    if (this.options.autoplay) this.play();
    this.linkAsNavFor();
    (this.root as HTMLElement & { __slickless?: Slickless }).__slickless = this;
    this.root.classList.add(CLASS.initialized);
    // Defer the init event so callers can subscribe immediately after
    // `new Slickless(...)` returns.
    const emitInit = () => {
      if (!this.destroyed) this.emit("init", { slickless: this });
    };
    if (typeof queueMicrotask === "function") queueMicrotask(emitInit);
    else Promise.resolve().then(emitInit);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.pause();
    this.unbindEvents();
    if (this.resizeObserver) this.resizeObserver.disconnect();

    this.root.innerHTML = "";
    for (const child of this.originalChildren) {
      this.root.appendChild(child);
      child.removeAttribute("aria-hidden");
      child.removeAttribute("tabindex");
      child.removeAttribute("role");
      child.removeAttribute("aria-roledescription");
      child.removeAttribute("aria-label");
      child.style.cssText = "";
    }
    this.root.className = this.root.className
      .split(/\s+/)
      .filter((c) => !c.startsWith("slickless"))
      .join(" ")
      .trim();
    this.root.removeAttribute("role");
    this.root.removeAttribute("aria-roledescription");
    this.root.removeAttribute("dir");

    this.destroyed = true;
    this.emit("destroy", { slickless: this });
    this.listeners.clear();
  }

  reInit(): void {
    const wasIndex = this.currentIndex;
    const wasAutoplaying = this.options.autoplay && !this.autoplayPaused;
    this.pause();
    this.unbindEvents();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.root.innerHTML = "";
    for (const child of this.originalChildren) this.root.appendChild(child);
    this.options = mergeOptions(DEFAULTS, this.userOptions);
    this.applyResponsive();
    this.build();
    this.bindEvents();
    this.goTo(clamp(wasIndex, 0, this.slideCount - 1), true);
    if (wasAutoplaying) this.play();
    this.emit("reInit", { slickless: this });
  }

  private captureChildren(): void {
    if (this.originalChildren.length === 0) {
      this.originalChildren = Array.from(this.root.children) as HTMLElement[];
    }
  }

  /**
   * Evaluate the responsive breakpoint list against the current viewport,
   * re-merging `this.options` from the resolved settings. Always re-applies
   * the merge — callers like `reInit()` reset `options` first and rely on
   * this method to layer the active breakpoint back on top. Returns whether
   * the active breakpoint changed; resize handlers use that to decide
   * between a cheap re-layout and a full rebuild (dots, clones and arrows
   * all depend on the post-breakpoint slidesToShow).
   */
  private applyResponsive(): boolean {
    const responsive = this.options.responsive;
    if (!responsive || responsive.length === 0) return false;
    if (typeof window === "undefined") return false;
    const width = window.innerWidth;
    const sorted: ResponsiveBreakpoint[] = [...responsive].sort(
      (a, b) => a.breakpoint - b.breakpoint,
    );
    let active: ResponsiveBreakpoint | null = null;
    for (const item of sorted) {
      if (width <= item.breakpoint) {
        active = item;
        break;
      }
    }
    const newBp = active ? active.breakpoint : null;
    const changed = newBp !== this.currentBreakpoint;
    this.currentBreakpoint = newBp;
    if (active?.settings === "unslick") {
      if (changed) this.destroy();
      return changed;
    }
    this.options = active
      ? mergeOptions(mergeOptions(DEFAULTS, this.userOptions), active.settings)
      : mergeOptions(DEFAULTS, this.userOptions);
    if (changed) {
      this.emit("breakpoint", { breakpoint: newBp });
    }
    return changed;
  }

  private build(): void {
    this.root.innerHTML = "";
    this.root.classList.add(CLASS.root);
    this.root.classList.toggle(CLASS.vertical, this.options.vertical);
    this.root.classList.toggle(CLASS.fade, this.options.fade);
    this.root.classList.toggle(CLASS.rtl, this.options.rtl);
    this.root.classList.toggle(CLASS.centerMode, this.options.centerMode);
    this.root.classList.toggle(CLASS.adaptive, this.options.adaptiveHeight);
    // Expose the slide transition duration to CSS so optional effects like
    // the center-mode scale can stay in sync with the configured speed.
    this.root.style.setProperty(
      "--slickless-transition-duration",
      `${this.effectiveSpeed()}ms`,
    );
    this.root.setAttribute("role", "region");
    this.root.setAttribute("aria-roledescription", this.options.ariaRoleDescription);
    if (this.options.rtl) this.root.setAttribute("dir", "rtl");

    this.viewport = createEl("div", CLASS.viewport);
    this.track = createEl("div", CLASS.track, { role: "presentation" });

    const realSlides = this.originalChildren.map((child, i) => this.wrapAsSlide(child, i));
    this.slideCount = realSlides.length;

    if (
      this.options.infinite &&
      !this.options.fade &&
      this.slideCount > 0 &&
      !this.allSlidesFit()
    ) {
      // For variableWidth we can't predict how many slides the viewport will
      // hold (each slide has its own intrinsic width), so clone the full set
      // at both ends. For fixed-width layouts, slidesToShow tells us exactly
      // how many neighbours need to be available beyond the current window.
      const desired = this.options.variableWidth
        ? this.slideCount
        : Math.max(this.options.slidesToShow, 1);
      this.cloneCount = Math.min(desired, this.slideCount);
      const head = realSlides.slice(-this.cloneCount).map((s) => this.cloneSlide(s));
      const tail = realSlides.slice(0, this.cloneCount).map((s) => this.cloneSlide(s));
      this.slides = [...head, ...realSlides, ...tail];
    } else {
      this.cloneCount = 0;
      this.slides = realSlides;
    }

    for (const slide of this.slides) this.track.appendChild(slide);
    this.viewport.appendChild(this.track);
    this.root.appendChild(this.viewport);

    if (this.options.arrows && this.slideCount > this.options.slidesToShow) {
      this.buildArrows();
    }
    // Dots are meaningless when every slide is already visible at once.
    if (this.options.dots && !this.allSlidesFit()) {
      this.buildDots();
    }

    this.applyLayout();
    this.applyLazyLoad();
  }

  private wrapAsSlide(child: HTMLElement, index: number): HTMLElement {
    const slide = createEl("div", CLASS.slide, {
      role: "group",
      "aria-roledescription": "slide",
      "aria-label": `${index + 1} of ${this.originalChildren.length}`,
      "data-slick-index": String(index),
    });
    slide.appendChild(child);
    return slide;
  }

  private cloneSlide(original: HTMLElement): HTMLElement {
    const clone = original.cloneNode(true) as HTMLElement;
    clone.classList.add(CLASS.slideCloned);
    // The clone's inert state is managed by updateAria(): clones briefly
    // become the visually active slide during an infinite wrap, and pointer
    // events / focus must work on them in that window.
    return clone;
  }

  private buildArrows(): void {
    const prevHtml = this.options.prevArrow;
    const nextHtml = this.options.nextArrow;
    this.prevArrow = this.resolveArrow(prevHtml, "prev");
    this.nextArrow = this.resolveArrow(nextHtml, "next");
    this.root.appendChild(this.prevArrow);
    this.root.appendChild(this.nextArrow);
    this.prevArrow.addEventListener("click", this.handlePrevClick);
    this.nextArrow.addEventListener("click", this.handleNextClick);
  }

  private resolveArrow(custom: string | HTMLElement | null, dir: "prev" | "next"): HTMLElement {
    let el: HTMLElement;
    if (custom instanceof HTMLElement) {
      el = custom.cloneNode(true) as HTMLElement;
    } else if (typeof custom === "string" && custom.trim()) {
      const tmp = document.createElement("div");
      tmp.innerHTML = custom.trim();
      el = (tmp.firstElementChild as HTMLElement) ?? createEl("button");
    } else {
      el = createEl("button", "", { type: "button" });
      el.innerHTML =
        dir === "prev"
          ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    el.classList.add(CLASS.arrow, dir === "prev" ? CLASS.arrowPrev : CLASS.arrowNext);
    el.setAttribute("aria-label", dir === "prev" ? "Previous slide" : "Next slide");
    if (el.tagName !== "BUTTON") el.setAttribute("role", "button");
    return el;
  }

  private buildDots(): void {
    this.dotsList = createEl("ul", CLASS.dots, { role: "tablist" });
    const pageCount = this.pageCount();
    for (let i = 0; i < pageCount; i++) {
      const li = createEl("li", "", { role: "presentation" });
      const target = i * this.options.slidesToScroll;
      const usingCustom = !!this.options.customPaging;
      const inner = usingCustom
        ? this.options.customPaging!(i, pageCount)
        : createEl("button", `${CLASS.dot} ${CLASS.dotBullet}`, {
            type: "button",
            "aria-label": `Go to slide ${i + 1}`,
            role: "tab",
          });
      const button = typeof inner === "string" ? this.htmlToElement(inner) : inner;
      // Always add the base class so updateDots() can find the dot.
      // Only the default bullet variant gets the visual styling class.
      button.classList.add(CLASS.dot);
      button.setAttribute("data-slick-target", String(target));
      button.addEventListener("click", () => this.goTo(target));
      li.appendChild(button);
      this.dotsList.appendChild(li);
    }
    this.root.appendChild(this.dotsList);
  }

  private htmlToElement(html: string): HTMLElement {
    const tmp = document.createElement("div");
    tmp.innerHTML = html.trim();
    const el = tmp.firstElementChild as HTMLElement | null;
    if (el) return el;
    const btn = createEl("button", "", { type: "button" });
    btn.textContent = html;
    return btn;
  }

  private viewportSize(): number {
    const rect = this.viewport.getBoundingClientRect();
    return this.options.vertical ? rect.height : rect.width;
  }

  private slideSize(): number {
    if (this.options.variableWidth) {
      const real = this.slides[this.cloneCount];
      if (real) {
        const r = real.getBoundingClientRect();
        return this.options.vertical ? r.height : r.width;
      }
    }
    const vp = this.viewportSize();
    if (this.options.centerMode) {
      // centerPadding shrinks the slides so neighbours peek through on both
      // sides. Without subtracting it here the option would have no effect.
      const pad = this.parseCenterPadding(vp);
      return Math.max(1, (vp - 2 * pad) / Math.max(1, this.options.slidesToShow));
    }
    return vp / Math.max(1, this.options.slidesToShow);
  }

  /**
   * Resolve `centerPadding` (e.g. "50px" or "10%") to a pixel value based on
   * the current viewport size. Negative or unparseable values fall back to 0.
   */
  private parseCenterPadding(viewportSize: number): number {
    const raw = (this.options.centerPadding ?? "").trim();
    if (!raw) return 0;
    const match = /^(-?\d+(?:\.\d+)?)\s*(px|%)?$/.exec(raw);
    if (!match || match[1] === undefined) return 0;
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value) || value < 0) return 0;
    const unit = match[2] ?? "px";
    return unit === "%" ? (value / 100) * viewportSize : value;
  }

  private applyLayout(): void {
    if (this.slideCount === 0) return;
    const vp = this.viewportSize();

    if (this.options.fade) {
      this.track.style.transform = "";
      for (let i = 0; i < this.slides.length; i++) {
        const slide = this.slides[i];
        if (!slide) continue;
        slide.style.opacity = i === this.realToTrackIndex(this.currentIndex) ? "1" : "0";
        slide.style.zIndex = i === this.realToTrackIndex(this.currentIndex) ? "1" : "0";
        slide.style.transition = `opacity ${this.effectiveSpeed()}ms ${this.options.cssEase}`;
        slide.style.pointerEvents =
          i === this.realToTrackIndex(this.currentIndex) ? "auto" : "none";
      }
      this.updateAria();
      this.updateArrows();
      this.updateDots();
      return;
    }

    // Use the shared slideSize() helper so centerPadding is honoured by both
    // the slide-width writes here and the offset maths in indexToOffset.
    const slideSize = this.options.variableWidth ? null : this.slideSize();

    for (const slide of this.slides) {
      slide.style.position = "";
      slide.style.top = "";
      slide.style.left = "";
      slide.style.height = "";
      slide.style.opacity = "";
      slide.style.zIndex = "";
      slide.style.transition = "";
      slide.style.pointerEvents = "";
      if (slideSize !== null) {
        if (this.options.vertical) {
          slide.style.width = "100%";
          slide.style.height = `${slideSize}px`;
        } else {
          slide.style.height = "";
          slide.style.width = `${slideSize}px`;
        }
      }
    }

    this.translateTo(this.indexToOffset(this.realToTrackIndex(this.currentIndex)), false);
    this.updateAria();
    this.updateArrows();
    this.updateDots();
    this.updateAdaptiveHeight();
  }

  private effectiveSpeed(): number {
    if (this.options.respectReducedMotion && prefersReducedMotion()) return 0;
    return this.options.speed;
  }

  /**
   * Every slide already fits in the viewport — there's nothing to scroll to,
   * so dots, autoplay and clones are all suppressed. variableWidth keeps the
   * usual machinery because per-slide widths aren't predictable upfront.
   */
  private allSlidesFit(): boolean {
    if (this.options.variableWidth) return false;
    return this.slideCount > 0 && this.slideCount <= this.options.slidesToShow;
  }

  private indexToOffset(trackIndex: number): number {
    // No room to scroll — track stays put; CSS `justify-content: safe center`
    // handles visual centering. centerMode keeps its own offset math because
    // it already implements per-slide centering.
    if (this.allSlidesFit() && !this.options.centerMode) return 0;
    if (this.options.variableWidth) {
      let offset = 0;
      for (let i = 0; i < trackIndex; i++) {
        const s = this.slides[i];
        if (!s) continue;
        const r = s.getBoundingClientRect();
        offset += this.options.vertical ? r.height : r.width;
      }
      if (this.options.centerMode) {
        const focused = this.slides[trackIndex];
        if (focused) {
          const r = focused.getBoundingClientRect();
          offset -=
            (this.viewportSize() - (this.options.vertical ? r.height : r.width)) / 2;
        }
      }
      return offset;
    }
    const size = this.slideSize();
    let offset = trackIndex * size;
    if (this.options.centerMode) {
      offset -= (this.viewportSize() - size) / 2;
    } else if (!this.options.infinite && !this.options.fade) {
      // Don't translate past the end — keeps the last "window" of slides flush
      // with the viewport even when `goTo` targets a later index than fits.
      const maxOffset = Math.max(0, (this.slideCount - this.options.slidesToShow) * size);
      offset = Math.min(offset, maxOffset);
    }
    return offset;
  }

  private translateTo(offset: number, animate: boolean): void {
    const speed = animate ? this.effectiveSpeed() : 0;
    const axis = this.options.vertical ? "Y" : "X";
    const dir = this.options.rtl && !this.options.vertical ? 1 : -1;
    this.track.style.transition = speed > 0 ? `transform ${speed}ms ${this.options.cssEase}` : "";
    this.track.style.transform = `translate${axis}(${dir * offset}px)`;
  }

  next(): void {
    this.goTo(this.currentIndex + this.options.slidesToScroll);
  }

  prev(): void {
    this.goTo(this.currentIndex - this.options.slidesToScroll);
  }

  goTo(index: number, immediate = false): void {
    if (this.destroyed) return;
    if (this.slideCount === 0) return;
    // Lock out new navigation while a transition is in flight. Rapid clicks
    // beyond the current animation are simply dropped — predictable beats
    // clever here.
    if (this.animating && !immediate) return;

    // Manual navigation (arrow click, dot click, swipe, asNavFor sync,
    // programmatic goTo) should restart the autoplay countdown so the
    // automatic advance doesn't fire right on top of the user's action.
    // Skipped when autoplay is currently paused (e.g. by hover/focus) —
    // those pauses are released by their own handlers.
    if (this.options.autoplay && !this.autoplayPaused) {
      this.scheduleAutoplay();
    }

    let target = index;
    const wrapEnabled = this.options.infinite && !this.options.fade;

    if (!this.options.infinite) {
      // Finite carousel — clamp the target to a valid slide index and emit
      // `edge` when callers walk past either end. The visual translation is
      // clamped separately in indexToOffset so the track doesn't reveal
      // empty space. This separation lets callers focus a specific slide
      // (asNavFor / focusOnSelect) even when every slide already fits in
      // the viewport.
      const maxIndex = Math.max(0, this.slideCount - 1);
      if (target < 0) {
        this.emit("edge", { direction: this.options.rtl ? "right" : "left" } satisfies EdgeDetail);
        target = 0;
      }
      if (target > maxIndex) {
        this.emit("edge", { direction: this.options.rtl ? "left" : "right" } satisfies EdgeDetail);
        target = maxIndex;
      }
    } else if (this.options.fade) {
      // Fade + infinite has no clones to animate through, but the index
      // still needs to wrap so autoplay / next / prev cycle continuously.
      target = mod(target, this.slideCount);
    }

    const previous = this.currentIndex;
    const detail: BeforeChangeDetail = {
      currentSlide: previous,
      nextSlide: wrapEnabled ? mod(target, this.slideCount) : target,
    };
    this.emit("beforeChange", detail);
    // Sync the linked carousel as soon as the change starts so both animate in
    // parallel. Waiting until afterChange (the previous behaviour) stalled the
    // partner by the source's full speed before it could even begin to move.
    this.notifyLinked(detail.nextSlide);

    if (this.options.fade) {
      // Fade transitions via per-slide opacity — there's no track movement
      // to animate, so applyLayout is the entire visual update.
      this.currentIndex = target;
      this.applyLayout();
      const after: AfterChangeDetail = { currentSlide: this.currentIndex };
      this.emit("afterChange", after);
      this.applyLazyLoad();
      return;
    }

    // Slide mode — animate the track transform. Both infinite and finite
    // carousels share this path; only the wrap-snap inside finish() differs.
    this.animating = true;
    const trackIndex = target + this.cloneCount;
    this.animatingTo = trackIndex;
    const offset = this.indexToOffset(trackIndex);
    this.translateTo(offset, !immediate);
    // Start the height transition at the same instant as the slide transform
    // so they animate together. Without this the viewport would only resize
    // after the slide finished moving, which felt like a delayed reflow.
    this.updateAdaptiveHeight(trackIndex);
    // Same idea for center mode — toggle the `--center` class on the target
    // slide right away so its scale-up animates concurrently with the track
    // translate instead of popping in after the slide settles.
    this.updateCenterMode(trackIndex);
    // And the dots: highlight the upcoming page as soon as navigation starts,
    // so the indicator tracks the slide instead of lagging behind it.
    this.updateDots(wrapEnabled ? mod(target, this.slideCount) : target);
    // Same reasoning for the per-slide `--active`/`--current` classes — CSS
    // hooked off them (e.g. an underline indicator on a focusOnSelect nav
    // strip) should animate in lockstep with the source carousel instead of
    // waiting for the track's own transition to finish. The full a11y state
    // (inert/tabindex/focus) still updates in finish() because that's a
    // settle-state concern, not a visual-feedback one.
    this.updateSlideClasses(trackIndex);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.animating = false;
      // Infinite carousels may have animated through a clone — snap the
      // track to the equivalent real slide so subsequent navigation has the
      // right starting offset. Finite carousels animated to the actual
      // target index, so nothing to do.
      if (wrapEnabled) {
        const wrapped = mod(target, this.slideCount);
        const needsSnap = wrapped !== target;
        this.currentIndex = wrapped;
        if (needsSnap) {
          const newTrackIndex = wrapped + this.cloneCount;
          // Suppress per-slide transitions across the snap so that handing
          // the center class from the clone we animated into to the real
          // slide doesn't trigger a second 0.92 → 1 scale animation.
          this.suppressSlideTransitionsForOneFrame();
          this.translateTo(this.indexToOffset(newTrackIndex), false);
        }
      } else {
        this.currentIndex = target;
      }
      this.animatingTo = null;
      this.updateAria();
      this.updateArrows();
      this.updateDots();
      const after: AfterChangeDetail = { currentSlide: this.currentIndex };
      this.emit("afterChange", after);
      this.applyLazyLoad();
    };

    if (immediate || this.effectiveSpeed() === 0) {
      finish();
    } else {
      const onEnd = (e: TransitionEvent) => {
        // Only react to the track's own transform transition. Without these
        // filters, descendant transitions (e.g. center-mode slide scale) fire
        // transitionend on this listener too and finish the animation early,
        // which makes rapid arrow clicks visually jump.
        if (e.target !== this.track) return;
        if (e.propertyName !== "transform") return;
        this.track.removeEventListener("transitionend", onEnd);
        finish();
      };
      this.track.addEventListener("transitionend", onEnd);
      setTimeout(() => {
        if (this.animating) {
          this.track.removeEventListener("transitionend", onEnd);
          finish();
        }
      }, this.effectiveSpeed() + 50);
    }
  }

  play(): void {
    if (this.destroyed) return;
    // Nothing to rotate through — silently skip instead of spinning a timer.
    if (this.allSlidesFit()) return;
    this.options.autoplay = true;
    this.autoplayPaused = false;
    this.scheduleAutoplay();
  }

  pause(): void {
    this.autoplayPaused = true;
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  private scheduleAutoplay(): void {
    if (!this.options.autoplay || this.autoplayPaused) return;
    if (this.autoplayTimer) clearTimeout(this.autoplayTimer);
    this.autoplayTimer = setTimeout(() => {
      if (this.options.autoplayDirection === "backward") this.prev();
      else this.next();
      this.scheduleAutoplay();
    }, this.options.autoplaySpeed);
  }

  on<T = unknown>(event: string, handler: (detail: T) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(handler as (detail: unknown) => void);
    return () => set.delete(handler as (detail: unknown) => void);
  }

  off(event: string, handler: (detail: unknown) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, detail: unknown): void {
    this.listeners.get(event)?.forEach((fn) => fn(detail));
    this.root.dispatchEvent(new CustomEvent(`slickless:${event}`, { detail, bubbles: false }));
  }

  private handlePrevClick = (e: Event): void => {
    e.preventDefault();
    this.prev();
  };

  private handleNextClick = (e: Event): void => {
    e.preventDefault();
    this.next();
  };

  private handleResize = (): void => {
    // Height-only changes (e.g. adaptiveHeight resizing the viewport) shouldn't
    // re-snap the track transform — that interrupts in-flight slide animations.
    const width = this.root.getBoundingClientRect().width;
    if (width === this.lastRootWidth) return;
    this.lastRootWidth = width;
    if (this.applyResponsive()) {
      // Breakpoint changed — slidesToShow, infinite, dots, autoplay etc. may
      // all be different now, so do a full rebuild. reInit preserves the
      // current slide index and autoplay state.
      if (!this.destroyed) this.reInit();
      return;
    }
    this.applyLayout();
  };

  private handleKey = (e: KeyboardEvent): void => {
    if (!this.options.accessibility) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (this.options.rtl) this.next();
      else this.prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (this.options.rtl) this.prev();
      else this.next();
    } else if (e.key === "Home") {
      e.preventDefault();
      this.goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      this.goTo(this.slideCount - 1);
    }
  };

  private handleMouseEnter = (): void => {
    if (this.options.pauseOnHover && this.options.autoplay) {
      this.autoplayPaused = true;
      if (this.autoplayTimer) clearTimeout(this.autoplayTimer);
    }
  };

  private handleMouseLeave = (): void => {
    if (this.options.pauseOnHover && this.options.autoplay) {
      this.autoplayPaused = false;
      this.scheduleAutoplay();
    }
  };

  private handleFocusIn = (): void => {
    if (this.options.pauseOnFocus && this.options.autoplay) {
      this.autoplayPaused = true;
      if (this.autoplayTimer) clearTimeout(this.autoplayTimer);
    }
  };

  private handleFocusOut = (e: FocusEvent): void => {
    if (this.options.pauseOnFocus && this.options.autoplay) {
      const next = e.relatedTarget as Node | null;
      if (!next || !this.root.contains(next)) {
        this.autoplayPaused = false;
        this.scheduleAutoplay();
      }
    }
  };

  private bindEvents(): void {
    this.root.addEventListener("keydown", this.handleKey);
    this.root.addEventListener("mouseenter", this.handleMouseEnter);
    this.root.addEventListener("mouseleave", this.handleMouseLeave);
    this.root.addEventListener("focusin", this.handleFocusIn);
    this.root.addEventListener("focusout", this.handleFocusOut);
    this.root.setAttribute("tabindex", "0");

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.root);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
    }

    if (this.options.draggable) this.bindPointerEvents();
    if (this.options.focusOnSelect) this.bindFocusOnSelect();
  }

  private unbindEvents(): void {
    this.root.removeEventListener("keydown", this.handleKey);
    this.root.removeEventListener("mouseenter", this.handleMouseEnter);
    this.root.removeEventListener("mouseleave", this.handleMouseLeave);
    this.root.removeEventListener("focusin", this.handleFocusIn);
    this.root.removeEventListener("focusout", this.handleFocusOut);
    if (typeof window !== "undefined")
      window.removeEventListener("resize", this.handleResize);
    if (this.prevArrow) this.prevArrow.removeEventListener("click", this.handlePrevClick);
    if (this.nextArrow) this.nextArrow.removeEventListener("click", this.handleNextClick);
    this.unbindPointerEvents();
  }

  private bindPointerEvents(): void {
    // Fade carousels keep gesture detection but skip track-following: the
    // slides are stacked absolutely and crossfade via opacity, so there's
    // nothing to translate while the finger is down. Only the swipe
    // verdict on pointerup matters.
    const followsFinger = (): boolean => !this.options.fade;

    const onDown = (e: PointerEvent) => {
      if (this.animating) return;
      if (e.button !== undefined && e.button !== 0) return;
      const startTransform = followsFinger() ? this.parseTranslate() : 0;
      this.pointer = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: performance.now(),
        startTransform,
        active: true,
        decided: false,
        isHorizontal: !this.options.vertical,
      };
      if (followsFinger()) this.track.style.transition = "";
      this.root.classList.add(CLASS.dragging);
    };

    const onMove = (e: PointerEvent) => {
      if (!this.pointer || !this.pointer.active || this.pointer.id !== e.pointerId) return;
      const dx = e.clientX - this.pointer.startX;
      const dy = e.clientY - this.pointer.startY;
      if (!this.pointer.decided) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < 6 && absY < 6) return;
        this.pointer.isHorizontal = absX > absY;
        this.pointer.decided = true;
        if (this.options.vertical ? this.pointer.isHorizontal : !this.pointer.isHorizontal) {
          this.pointer.active = false;
          this.root.classList.remove(CLASS.dragging);
          return;
        }
      }
      if (followsFinger()) {
        const delta = this.options.vertical ? dy : dx;
        const dir = this.options.rtl && !this.options.vertical ? -1 : 1;
        const newOffset = this.pointer.startTransform - dir * delta;
        const axis = this.options.vertical ? "Y" : "X";
        const transformDir = this.options.rtl && !this.options.vertical ? 1 : -1;
        this.track.style.transform = `translate${axis}(${transformDir * newOffset}px)`;
      }
      if (typeof (e as PointerEvent).preventDefault === "function") e.preventDefault();
    };

    const onUp = (e: PointerEvent) => {
      if (!this.pointer || this.pointer.id !== e.pointerId) return;
      const wasActive = this.pointer.active;
      const dx = e.clientX - this.pointer.startX;
      const dy = e.clientY - this.pointer.startY;
      const elapsed = performance.now() - this.pointer.startTime;
      this.root.classList.remove(CLASS.dragging);
      this.pointer = null;
      if (!wasActive) return;

      const delta = this.options.vertical ? dy : dx;
      const velocity = Math.abs(delta) / Math.max(1, elapsed);
      const threshold = this.options.swipeThreshold;

      const swiped = Math.abs(delta) > threshold || velocity > 0.6;
      if (swiped) {
        const goPrev = this.options.rtl && !this.options.vertical ? delta < 0 : delta > 0;
        if (goPrev) {
          this.emit("swipe", {
            direction: this.options.vertical ? "down" : "right",
          } satisfies SwipeDetail);
          this.prev();
        } else {
          this.emit("swipe", {
            direction: this.options.vertical ? "up" : "left",
          } satisfies SwipeDetail);
          this.next();
        }
      } else if (followsFinger()) {
        // Snap the track back to the resting position. Fade mode never
        // moved the track so there's nothing to snap.
        this.goTo(this.currentIndex, true);
      }
    };

    const onCancel = (e: PointerEvent) => {
      if (!this.pointer || this.pointer.id !== e.pointerId) return;
      this.root.classList.remove(CLASS.dragging);
      this.pointer = null;
      if (followsFinger()) this.goTo(this.currentIndex, true);
    };

    const downHandler = onDown as (e: Event) => void;
    const moveHandler = onMove as (e: Event) => void;
    const upHandler = onUp as (e: Event) => void;
    const cancelHandler = onCancel as (e: Event) => void;
    this.pointerHandlers = {
      down: downHandler,
      move: moveHandler,
      up: upHandler,
      cancel: cancelHandler,
    };
    this.viewport.addEventListener("pointerdown", downHandler);
    window.addEventListener("pointermove", moveHandler, { passive: false });
    window.addEventListener("pointerup", upHandler);
    window.addEventListener("pointercancel", cancelHandler);
  }

  private unbindPointerEvents(): void {
    const { down, move, up, cancel } = this.pointerHandlers;
    if (!down) return;
    this.viewport.removeEventListener("pointerdown", down);
    if (move) window.removeEventListener("pointermove", move);
    if (up) window.removeEventListener("pointerup", up);
    if (cancel) window.removeEventListener("pointercancel", cancel);
    this.pointerHandlers = {};
  }

  private parseTranslate(): number {
    const t = this.track.style.transform;
    const m = /translate[XY]\((-?\d+(?:\.\d+)?)px\)/.exec(t);
    if (!m || !m[1]) return this.indexToOffset(this.realToTrackIndex(this.currentIndex));
    const v = parseFloat(m[1]);
    const dir = this.options.rtl && !this.options.vertical ? 1 : -1;
    return v / dir;
  }

  private bindFocusOnSelect(): void {
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      if (!slide) continue;
      slide.addEventListener("click", () => {
        const realIndex = i - this.cloneCount;
        if (realIndex >= 0 && realIndex < this.slideCount) this.goTo(realIndex);
      });
    }
  }

  private realToTrackIndex(realIndex: number): number {
    return realIndex + this.cloneCount;
  }

  private updateAria(): void {
    const trackIndex = this.realToTrackIndex(this.currentIndex);
    const activeSlide = this.slides[trackIndex];

    // Detect *before* mutating: is focus inside a slide that's about to be
    // marked inert? Browsers move focus to the document body the moment we
    // apply `inert` to its ancestor, which is functional but jarring. We'd
    // rather re-park focus on the new active slide so keyboard users keep
    // their place. The check has to happen before the attribute loop, because
    // afterwards `document.activeElement` is already body.
    let needsFocusMove = false;
    if (typeof document !== "undefined" && activeSlide) {
      const focused = document.activeElement;
      if (focused && focused !== document.body) {
        for (let i = 0; i < this.slides.length; i++) {
          const slide = this.slides[i];
          if (!slide) continue;
          if (this.isSlideInActiveRange(i, trackIndex)) continue;
          if (slide.contains(focused)) {
            needsFocusMove = true;
            break;
          }
        }
      }
    }

    this.updateSlideClasses(trackIndex);
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      if (!slide) continue;
      const isActive = this.isSlideInActiveRange(i, trackIndex);
      const isCloned = slide.classList.contains(CLASS.slideCloned);
      if (isActive) {
        slide.removeAttribute("inert");
        // Only real slides get a focusable wrapper. Cloned slides defer to
        // their descendants (links, buttons) for tab order so the same logical
        // slide isn't reachable through two wrappers in the same tab cycle.
        if (!isCloned) slide.setAttribute("tabindex", "0");
      } else {
        slide.setAttribute("inert", "");
        slide.removeAttribute("tabindex");
      }
    }

    if (needsFocusMove && activeSlide) {
      activeSlide.focus({ preventScroll: true });
    }

    // Re-sync center class after settle so any state that diverged from the
    // in-flight target (e.g. a snap after an infinite wrap) is corrected.
    this.updateCenterMode(trackIndex);
  }

  private updateSlideClasses(currentTrackIndex: number): void {
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      if (!slide) continue;
      slide.classList.toggle(
        CLASS.slideActive,
        this.isSlideInActiveRange(i, currentTrackIndex),
      );
      slide.classList.toggle(CLASS.slideCurrent, i === currentTrackIndex);
    }
  }

  private suppressSlideTransitionsForOneFrame(): void {
    this.root.classList.add("slickless--snap");
    // Force layout flush so style change is committed before we restore it.
    void this.root.offsetWidth;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        // Run another rAF so the class is removed AFTER the snap frame has
        // painted — otherwise the browser may still batch and animate.
        requestAnimationFrame(() => this.root.classList.remove("slickless--snap"));
      });
    } else {
      setTimeout(() => this.root.classList.remove("slickless--snap"), 16);
    }
  }

  private updateCenterMode(trackIndex: number): void {
    if (!this.options.centerMode) return;
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      if (!slide) continue;
      slide.classList.toggle(CLASS.slideCenter, i === trackIndex);
    }
  }

  private isSlideInActiveRange(slideIdxInTrack: number, currentTrackIndex: number): boolean {
    // All-fit carousels show every slide at once, so the "active window"
    // concept doesn't apply — every slide is visible and must stay
    // interactive. Without this, moving currentIndex would mark the
    // already-visible slides outside the [current, current+slidesToShow)
    // range as inert and they'd silently stop accepting clicks (e.g. a
    // focusOnSelect nav strip after picking a non-first item).
    if (this.allSlidesFit()) return true;
    const show = Math.max(1, this.options.slidesToShow);
    if (this.options.centerMode) {
      const half = Math.floor(show / 2);
      return (
        slideIdxInTrack >= currentTrackIndex - half &&
        slideIdxInTrack < currentTrackIndex + show - half
      );
    }
    return (
      slideIdxInTrack >= currentTrackIndex && slideIdxInTrack < currentTrackIndex + show
    );
  }

  private updateArrows(): void {
    if (!this.prevArrow || !this.nextArrow) return;
    if (this.options.infinite || this.options.fade) {
      this.prevArrow.classList.remove(CLASS.arrowDisabled);
      this.nextArrow.classList.remove(CLASS.arrowDisabled);
      this.prevArrow.removeAttribute("aria-disabled");
      this.nextArrow.removeAttribute("aria-disabled");
      return;
    }
    const atStart = this.currentIndex <= 0;
    const atEnd = this.currentIndex >= this.slideCount - this.options.slidesToShow;
    this.prevArrow.classList.toggle(CLASS.arrowDisabled, atStart);
    this.nextArrow.classList.toggle(CLASS.arrowDisabled, atEnd);
    this.prevArrow.setAttribute("aria-disabled", String(atStart));
    this.nextArrow.setAttribute("aria-disabled", String(atEnd));
    // Use only aria-disabled + CSS for the visual/semantic disabled state.
    // Setting the native `disabled` attribute would suppress click events,
    // which would also suppress the `edge` event when users click an arrow
    // already at the boundary — different from drag-at-edge behaviour.
    if (this.prevArrow.tagName === "BUTTON")
      (this.prevArrow as HTMLButtonElement).disabled = false;
    if (this.nextArrow.tagName === "BUTTON")
      (this.nextArrow as HTMLButtonElement).disabled = false;
  }

  private pageCount(): number {
    if (this.slideCount === 0) return 0;
    const pages = Math.ceil(
      (this.slideCount - (this.options.infinite ? 0 : this.options.slidesToShow - 1)) /
        Math.max(1, this.options.slidesToScroll),
    );
    return Math.max(1, pages);
  }

  private updateDots(realIndex?: number): void {
    if (!this.dotsList) return;
    const idx = realIndex ?? this.currentIndex;
    const pageIdx = Math.floor(idx / Math.max(1, this.options.slidesToScroll));
    const items = this.dotsList.querySelectorAll(`.${CLASS.dot}`);
    items.forEach((el, i) => {
      el.classList.toggle(CLASS.dotActive, i === pageIdx);
      el.setAttribute("aria-selected", i === pageIdx ? "true" : "false");
    });
  }

  private updateAdaptiveHeight(trackIndex?: number): void {
    if (!this.options.adaptiveHeight || this.options.vertical) return;
    // Prefer (in order): explicit trackIndex argument, the in-flight
    // animation target, then the current slide. This stops mid-animation
    // resize observers from snapping the height back to the old slide.
    const idx = trackIndex ?? this.animatingTo ?? this.realToTrackIndex(this.currentIndex);
    const slide = this.slides[idx];
    if (!slide) return;
    const h = slide.getBoundingClientRect().height;
    if (h > 0) this.viewport.style.height = `${h}px`;
  }

  private applyLazyLoad(): void {
    if (!this.options.lazyLoad) return;
    if (this.options.lazyLoad === "progressive") {
      this.loadImagesIn(this.slides);
      return;
    }
    const show = Math.max(1, this.options.slidesToShow);
    const currentTrack = this.realToTrackIndex(this.currentIndex);
    const buffer = 1;
    const start = currentTrack - buffer;
    const end = currentTrack + show + buffer;
    const targets: HTMLElement[] = [];
    for (let i = start; i < end; i++) {
      // Only wrap into the clone region when the carousel is actually
      // infinite. For finite carousels the buffer should clip at the edges
      // instead of cycling round and pre-loading the opposite end.
      const idx = this.options.infinite ? mod(i, this.slides.length) : i;
      if (idx < 0 || idx >= this.slides.length) continue;
      const s = this.slides[idx];
      if (s) targets.push(s);
    }
    this.loadImagesIn(targets);
  }

  private loadImagesIn(slides: HTMLElement[]): void {
    for (const slide of slides) {
      const imgs = slide.querySelectorAll<HTMLImageElement>("img[data-lazy]");
      imgs.forEach((img) => this.activateLazyImage(img));
    }
  }

  private activateLazyImage(img: HTMLImageElement): void {
    const src = img.getAttribute("data-lazy");
    if (!src) return;
    img.removeAttribute("data-lazy");
    img.addEventListener(
      "load",
      () => this.emit("lazyLoaded", { image: img, src } satisfies LazyLoadDetail),
      { once: true },
    );
    img.addEventListener(
      "error",
      () => this.emit("lazyLoadError", { image: img, src } satisfies LazyLoadDetail),
      { once: true },
    );
    img.src = src;
  }

  private linkAsNavFor(): void {
    const nav = this.options.asNavFor;
    if (!nav) return;
    const el = resolveElement(typeof nav === "string" ? nav : nav);
    if (!el) return;
    const instance = (el as HTMLElement & { __slickless?: Slickless }).__slickless;
    if (instance) {
      this.linkedNav = instance;
      // Subscribe to `beforeChange` so we react the moment the nav starts
      // moving instead of waiting for its animation to finish — that's what
      // lets both carousels animate in parallel.
      instance.on<BeforeChangeDetail>("beforeChange", (detail) => {
        if (this.linkedFromExternal) return;
        this.linkedFromExternal = true;
        this.goTo(detail.nextSlide);
        this.linkedFromExternal = false;
      });
    }
  }

  private notifyLinked(targetIndex: number): void {
    if (!this.linkedNav) return;
    if (this.linkedFromExternal) return;
    this.linkedFromExternal = true;
    this.linkedNav.goTo(targetIndex);
    this.linkedFromExternal = false;
  }

  getCurrentSlide(): number {
    return this.currentIndex;
  }

  getSlideCount(): number {
    return this.slideCount;
  }

  getSlides(): HTMLElement[] {
    return this.slides.slice(this.cloneCount, this.cloneCount + this.slideCount);
  }

  setOptions(options: Partial<SlicklessOptions>, refresh = true): void {
    this.userOptions = { ...this.userOptions, ...options };
    if (refresh) {
      this.reInit();
    } else {
      this.options = mergeOptions(this.options, options);
    }
  }

  /**
   * Recompute slide widths and re-position the track using the currently
   * stored options. Cheaper than `reInit` — no DOM teardown, no rebuild — and
   * suitable for live tweaks like dragging a slider that updates layout-only
   * options (e.g. `centerPadding`, `slidesToScroll`, `cssEase`).
   */
  refresh(): void {
    if (this.destroyed) return;
    this.applyLayout();
  }

  addSlide(element: HTMLElement, index?: number): void {
    if (typeof index === "number") {
      this.originalChildren.splice(index, 0, element);
    } else {
      this.originalChildren.push(element);
    }
    this.reInit();
  }

  removeSlide(index: number): void {
    if (index < 0 || index >= this.originalChildren.length) return;
    this.originalChildren.splice(index, 1);
    this.reInit();
  }
}
