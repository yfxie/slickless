import { Slickless } from "slickless";

export function initMulti(): void {
  new Slickless("#multi-carousel", {
    slidesToShow: 3,
    slidesToScroll: 1,
    dots: true,
    infinite: true,
    responsive: [
      { breakpoint: 960, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
    ],
  });
}
