import "./styles.css";
export { Slickless } from "./slickless";
export { DEFAULTS } from "./defaults";
export type {
  SlicklessOptions,
  ResponsiveBreakpoint,
  SlicklessEvent,
  BeforeChangeDetail,
  AfterChangeDetail,
  SwipeDetail,
  EdgeDetail,
  BreakpointDetail,
  LazyLoadDetail,
  Direction,
} from "./types";

import { Slickless as _Slickless } from "./slickless";
import type { SlicklessOptions } from "./types";

/** Functional helper — creates a Slickless instance. */
export function slickless(
  root: string | HTMLElement,
  options: Partial<SlicklessOptions> = {},
): _Slickless {
  return new _Slickless(root, options);
}

export default _Slickless;
