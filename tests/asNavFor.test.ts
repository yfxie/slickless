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
});
