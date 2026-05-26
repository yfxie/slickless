<div align="center">

# slickless

A jQuery-free rewrite of slick. Same option names, no runtime dependencies, ~8 KB gzipped.

[![npm](https://img.shields.io/npm/v/slickless.svg)](https://www.npmjs.com/package/slickless)
[![bundle](https://img.shields.io/bundlephobia/minzip/slickless)](https://bundlephobia.com/package/slickless)
[![license](https://img.shields.io/npm/l/slickless.svg)](./LICENSE)

[Live demo, options, API, recipes →](https://yfxie.github.io/slickless/)

📖 Languages: **English** · [繁體中文](./README.zh-TW.md)

</div>

---

## Why

Slick is the most-installed carousel of the jQuery era. The behaviour still holds up, but pulling jQuery into a modern bundle just for one widget no longer does.

| | slick | slickless |
|---|---|---|
| Dependencies | jQuery | none |
| Type declarations | community | shipped |
| Touch + mouse + pen | separate code paths | unified Pointer Events |
| Resize handling | `window.resize` | `ResizeObserver` |
| Reduced-motion respect | manual | built-in |
| ARIA roles | partial | full carousel pattern |
| Gzipped (core + CSS) | ~11 kB + jQuery (~24–30 kB) | ~8 kB, no deps |

Most option names carry straight over: `slidesToShow`, `infinite`, `fade`, `centerMode`, `asNavFor`, `customPaging`, `responsive`. The DOM uses BEM class names (`.slickless__track`, `.slickless__slide`, …) and you construct with `new Slickless(el, options)`. So it's a rename pass, not a drop-in.

## Install

```bash
bun add slickless
# or
pnpm add slickless
# or
npm install slickless
```

## Use

```js
import { Slickless } from "slickless";
import "slickless/style.css";

const carousel = new Slickless("#my-carousel", {
  slidesToShow: 3,
  dots: true,
  autoplay: true,
});

carousel.on("afterChange", ({ currentSlide }) => {
  console.log("now on", currentSlide);
});
```

```html
<div id="my-carousel">
  <div>Slide 1</div>
  <div>Slide 2</div>
  <div>Slide 3</div>
</div>
```

Each direct child becomes a slide. Add `data-lazy="…"` on `<img>` to defer image loads.

## Documentation

Options, API, events and styling recipes live on the demo:

**[yfxie.github.io/slickless](https://yfxie.github.io/slickless/)**

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari ≥ 14). Pointer Events, `ResizeObserver` and CSS custom properties are required.

## Development

```bash
bun install
bun run dev          # demo dev server
bun run test         # vitest
bun run build        # library bundle + d.ts
bun run build:demo   # demo build → demo-dist/
```

## License

[MIT](./LICENSE)
