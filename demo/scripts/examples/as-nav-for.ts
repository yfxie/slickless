import { Slickless } from "slickless";

export function initAsNavFor(): void {
  // Initialise the nav first so the main can subscribe to it.
  // All five labels stay visible across breakpoints; the CSS shrinks them
  // for narrow screens so we don't have to scroll a 5-item strip.
  new Slickless("#nav-strip", {
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: false,
    focusOnSelect: true,
    infinite: false,
    draggable: false,
    speed: 300,
  });
  new Slickless("#main-stage", {
    slidesToShow: 1,
    arrows: true,
    fade: true,
    asNavFor: "#nav-strip",
    infinite: true,
    speed: 600,
  });
}
