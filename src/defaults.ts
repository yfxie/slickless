import type { SlicklessOptions } from "./types";

export const DEFAULTS: SlicklessOptions = {
  arrows: true,
  dots: false,
  autoplay: false,
  autoplaySpeed: 3000,
  speed: 400,
  cssEase: "cubic-bezier(0.22, 1, 0.36, 1)",
  slidesToShow: 1,
  slidesToScroll: 1,
  infinite: true,
  fade: false,
  vertical: false,
  initialSlide: 0,
  variableWidth: false,
  centerMode: false,
  centerPadding: "50px",
  rtl: false,
  draggable: true,
  swipeThreshold: 24,
  pauseOnHover: true,
  pauseOnFocus: true,
  accessibility: true,
  adaptiveHeight: false,
  lazyLoad: false,
  respectReducedMotion: true,
  prevArrow: null,
  nextArrow: null,
  customPaging: null,
  ariaRoleDescription: "carousel",
  responsive: null,
  asNavFor: null,
  focusOnSelect: false,
  autoplayDirection: "forward",
};

export function mergeOptions(
  base: SlicklessOptions,
  override: Partial<SlicklessOptions>,
): SlicklessOptions {
  return { ...base, ...override };
}
