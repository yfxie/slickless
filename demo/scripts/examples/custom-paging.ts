import { Slickless } from "slickless";

export function initCustomPaging(): void {
  new Slickless("#custom-paging-carousel", {
    slidesToShow: 1,
    arrows: false,
    dots: true,
    speed: 500,
    infinite: true,
    customPaging: (i, total) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "frac";
      btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
      btn.textContent = `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      return btn;
    },
  });
}
