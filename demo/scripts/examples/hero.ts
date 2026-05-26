import { Slickless } from "slickless";

export function initHero(): void {
  new Slickless("#hero-carousel", {
    slidesToShow: 1,
    centerMode: true,
    centerPadding: "32px",
    autoplay: true,
    autoplaySpeed: 3200,
    speed: 600,
    dots: true,
    arrows: false,
    infinite: true,
  });
}
