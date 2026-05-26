export type EasingFunction = (t: number) => number;

export type Direction = "ltr" | "rtl";

export interface ResponsiveBreakpoint {
  /** Max-width breakpoint in px (mobile-first sense: applies below this width). */
  breakpoint: number;
  /** Options to merge when this breakpoint is active. Set to "unslick" to destroy on this breakpoint. */
  settings: Partial<SlicklessOptions> | "unslick";
}

export interface SlicklessOptions {
  /** Enable next/prev arrows. */
  arrows: boolean;
  /** Enable dot navigation. */
  dots: boolean;
  /** Automatically rotate slides. */
  autoplay: boolean;
  /** Autoplay interval in ms. */
  autoplaySpeed: number;
  /** Transition duration in ms. */
  speed: number;
  /** Easing function name (CSS easing) or a function. */
  cssEase: string;
  /** Slides visible at once. */
  slidesToShow: number;
  /** Slides to scroll per advance. */
  slidesToScroll: number;
  /** Loop slides infinitely. */
  infinite: boolean;
  /** Use fade transition instead of slide. */
  fade: boolean;
  /** Vertical mode. */
  vertical: boolean;
  /** Initial slide index. */
  initialSlide: number;
  /** Variable-width slides (use each slide's natural width). */
  variableWidth: boolean;
  /** Center mode — focused slide in the middle. */
  centerMode: boolean;
  /** Padding around the focused slide in center mode (e.g., "50px"). */
  centerPadding: string;
  /** Right-to-left direction. */
  rtl: boolean;
  /** Enable touch/mouse drag. */
  draggable: boolean;
  /** Distance in px needed to trigger a swipe. */
  swipeThreshold: number;
  /** Pause autoplay on hover. */
  pauseOnHover: boolean;
  /** Pause autoplay on focus. */
  pauseOnFocus: boolean;
  /** Enable arrow keys navigation. */
  accessibility: boolean;
  /** Adapt height to current slide. */
  adaptiveHeight: boolean;
  /** Lazy load images. "ondemand" loads as slides approach view; "progressive" loads sequentially. */
  lazyLoad: "ondemand" | "progressive" | false;
  /** Respect prefers-reduced-motion. */
  respectReducedMotion: boolean;
  /** Custom previous arrow HTML or element. */
  prevArrow: string | HTMLElement | null;
  /** Custom next arrow HTML or element. */
  nextArrow: string | HTMLElement | null;
  /** Custom dot renderer: (slideIndex) => HTMLElement | string. */
  customPaging: ((slideIndex: number, total: number) => HTMLElement | string) | null;
  /** ARIA roledescription for the carousel. */
  ariaRoleDescription: string;
  /** Responsive breakpoint settings. */
  responsive: ResponsiveBreakpoint[] | null;
  /** Linked carousel selector or instance for as-nav-for sync. */
  asNavFor: string | HTMLElement | null;
  /** Focus on select (clicking a slide focuses it). */
  focusOnSelect: boolean;
  /** Auto-play direction: forward or backward. */
  autoplayDirection: "forward" | "backward";
}

export type SlicklessEvent =
  | "init"
  | "beforeChange"
  | "afterChange"
  | "destroy"
  | "reInit"
  | "swipe"
  | "edge"
  | "lazyLoadError"
  | "lazyLoaded"
  | "breakpoint";

export interface BeforeChangeDetail {
  currentSlide: number;
  nextSlide: number;
}

export interface AfterChangeDetail {
  currentSlide: number;
}

export interface SwipeDetail {
  direction: "left" | "right" | "up" | "down";
}

export interface EdgeDetail {
  direction: "left" | "right" | "up" | "down";
}

export interface BreakpointDetail {
  breakpoint: number | null;
}

export interface LazyLoadDetail {
  image: HTMLImageElement;
  src: string;
}
