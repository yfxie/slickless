<div align="center">

# slickless

slick carousel 拿掉 jQuery 的重寫版。選項名稱不變，零執行期依賴，gzip 約 8 KB。

[![npm](https://img.shields.io/npm/v/slickless.svg)](https://www.npmjs.com/package/slickless)
[![bundle](https://img.shields.io/bundlephobia/minzip/slickless)](https://bundlephobia.com/package/slickless)
[![coverage](https://img.shields.io/codecov/c/github/yfxie/slickless)](https://codecov.io/gh/yfxie/slickless)
[![license](https://img.shields.io/npm/l/slickless.svg)](./LICENSE)

[線上範例、選項、API、樣式技巧 →](https://yfxie.github.io/slickless/)

📖 語言：[English](./README.md) · **繁體中文**

</div>

---

## 為什麼

slick 是 jQuery 時代裝機量最高的 carousel，行為到現在還很扎實。但為了一個 carousel 把 jQuery 拉進現代 bundle 已經說不過去了。

| | slick | slickless |
|---|---|---|
| 依賴 | jQuery | 無 |
| 型別宣告 | 社群提供 | 內建 |
| 觸控 + 滑鼠 + 觸控筆 | 各自處理 | 統一 Pointer Events |
| Resize 處理 | `window.resize` | `ResizeObserver` |
| 減少動態尊重 | 手動 | 內建 |
| ARIA 角色 | 部分 | 完整 carousel pattern |
| Gzip 後（核心 + CSS） | ~11 kB + jQuery（~24–30 kB） | ~8 kB，零依賴 |

大多數選項名稱完全沿用：`slidesToShow`、`infinite`、`fade`、`centerMode`、`asNavFor`、`customPaging`、`responsive`。DOM 採 BEM 命名（`.slickless__track`、`.slickless__slide` 等），初始化用 `new Slickless(el, options)`。所以遷移主要是改名工作，不是直接替換。

## 安裝

```bash
bun add slickless
# 或
pnpm add slickless
# 或
npm install slickless
```

## 使用

```js
import { Slickless } from "slickless";
import "slickless/style.css";

const carousel = new Slickless("#my-carousel", {
  slidesToShow: 3,
  dots: true,
  autoplay: true,
});

carousel.on("afterChange", ({ currentSlide }) => {
  console.log("目前在", currentSlide);
});
```

```html
<div id="my-carousel">
  <div>Slide 1</div>
  <div>Slide 2</div>
  <div>Slide 3</div>
</div>
```

每個直接子元素都會成為一張 slide。`<img>` 上加 `data-lazy="…"` 可延後圖片載入。

## 完整文件

選項、API、事件、樣式技巧都在線上 demo：

**[yfxie.github.io/slickless](https://yfxie.github.io/slickless/)**

## 瀏覽器支援

主流瀏覽器（Chrome、Edge、Firefox、Safari ≥ 14）。需要 Pointer Events、`ResizeObserver`、CSS Custom Properties。

## 開發

```bash
bun install
bun run dev          # demo 開發伺服器
bun run test         # vitest 測試
bun run build        # 函式庫建置 + d.ts
bun run build:demo   # demo 建置 → demo-dist/
```

## 授權

[MIT](./LICENSE)
