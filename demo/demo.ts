/* slickless demo — entry script
 *
 * Each example lives in ./scripts/examples/<name>.ts and exposes an init()
 * function. We call them in DOM order after the document is ready.
 */
import { initHero } from "./scripts/examples/hero";
import { initMulti } from "./scripts/examples/multi";
import { initFade } from "./scripts/examples/fade";
import { initVertical } from "./scripts/examples/vertical";
import { initCenter } from "./scripts/examples/center";
import { initAsNavFor } from "./scripts/examples/as-nav-for";
import { initCustomPaging } from "./scripts/examples/custom-paging";
import { initAdaptive } from "./scripts/examples/adaptive";
import { initVarwidth } from "./scripts/examples/varwidth";
import { initLazy } from "./scripts/examples/lazy";
import { initEvents } from "./scripts/examples/events";

document.addEventListener("DOMContentLoaded", () => {
  initHero();
  initMulti();
  initFade();
  initVertical();
  initCenter();
  initAsNavFor();
  initCustomPaging();
  initAdaptive();
  initVarwidth();
  initLazy();
  initEvents();
});
