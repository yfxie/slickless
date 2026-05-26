import { Slickless } from "slickless";

export function initCenter(): void {
  const carousel = new Slickless("#center-carousel", {
    centerMode: true,
    centerPadding: "60px",
    slidesToShow: 3,
    focusOnSelect: true,
    infinite: true,
    speed: 400,
    arrows: true,
    responsive: [
      { breakpoint: 720, settings: { slidesToShow: 1, centerPadding: "30px" } },
    ],
  });

  const range = document.querySelector<HTMLInputElement>("#center-padding-range");
  const valueLabel = document.querySelector<HTMLElement>("#center-padding-value");

  function syncRangeFill(input: HTMLInputElement): void {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const pct = ((Number(input.value) - min) / Math.max(1, max - min)) * 100;
    input.style.setProperty("--range-fill", `${pct}%`);
  }

  if (range) {
    syncRangeFill(range);
    range.addEventListener("input", () => {
      const px = `${range.value}px`;
      if (valueLabel) valueLabel.textContent = px;
      syncRangeFill(range);
      // setOptions with refresh:false avoids the full reInit on every input
      // tick; refresh() just re-runs applyLayout with the new centerPadding.
      carousel.setOptions({ centerPadding: px }, false);
      carousel.refresh();
    });
  }
}

