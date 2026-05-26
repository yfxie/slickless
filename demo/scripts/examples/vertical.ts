import { Slickless } from "slickless";

export function initVertical(): void {
  new Slickless("#vertical-carousel", {
    vertical: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    infinite: true,
    speed: 400,
  });
}
