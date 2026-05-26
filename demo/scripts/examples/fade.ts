import { Slickless } from "slickless";

export function initFade(): void {
  new Slickless("#fade-carousel", {
    fade: true,
    autoplay: true,
    autoplaySpeed: 3500,
    speed: 700,
    dots: true,
    arrows: false,
    infinite: true,
  });
}
