import { describe, expect, it } from "vitest";
import { Slickless } from "../src/slickless";

function makeRoot(id: string, count = 4): HTMLElement {
  const root = document.createElement("div");
  root.id = id;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.textContent = `S${i}`;
    root.appendChild(s);
  }
  document.body.appendChild(root);
  return root;
}

describe("asNavFor", () => {
  it("syncs from main to nav", () => {
    const main = makeRoot("main");
    const nav = makeRoot("nav");
    const navInst = new Slickless(nav, { infinite: false, speed: 0 });
    const mainInst = new Slickless(main, {
      infinite: false,
      speed: 0,
      asNavFor: "#nav",
    });
    mainInst.goTo(2);
    expect(navInst.getCurrentSlide()).toBe(2);
    mainInst.destroy();
    navInst.destroy();
    main.remove();
    nav.remove();
  });

  it("syncs from nav back to main", () => {
    const main = makeRoot("main2");
    const nav = makeRoot("nav2");
    const navInst = new Slickless(nav, { infinite: false, speed: 0 });
    const mainInst = new Slickless(main, {
      infinite: false,
      speed: 0,
      asNavFor: "#nav2",
    });
    navInst.goTo(3);
    expect(mainInst.getCurrentSlide()).toBe(3);
    mainInst.destroy();
    navInst.destroy();
    main.remove();
    nav.remove();
  });

  it("notifies the linked carousel at the start of the change, not after", () => {
    // Earlier versions hooked the sync onto `afterChange`, which meant the
    // partner had to wait for the source's full animation before it could even
    // begin to move — a noticeable lag when the nav and main had different
    // `speed` values. The sync should fire synchronously the moment the source
    // emits `beforeChange`, so both carousels animate in parallel.
    const main = makeRoot("main3");
    const nav = makeRoot("nav3");
    const navInst = new Slickless(nav, { infinite: false, speed: 300 });
    const mainInst = new Slickless(main, {
      infinite: false,
      speed: 600,
      fade: true,
      asNavFor: "#nav3",
    });

    let navBeforeChangeTarget = -1;
    navInst.on<{ nextSlide: number }>("beforeChange", (d) => {
      navBeforeChangeTarget = d.nextSlide;
    });

    // The whole `goTo` call must propagate the target to the nav synchronously,
    // regardless of how long the source's animation runs for.
    mainInst.goTo(2);
    expect(navBeforeChangeTarget).toBe(2);

    mainInst.destroy();
    navInst.destroy();
    main.remove();
    nav.remove();
  });
});
