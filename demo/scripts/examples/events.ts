import { Slickless } from "slickless";

function appendSpan(parent: HTMLElement, className: string, text: string): void {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  parent.appendChild(span);
}

export function initEvents(): void {
  const list = document.querySelector<HTMLOListElement>("#events-list");
  const clearBtn = document.querySelector<HTMLButtonElement>("#events-clear");
  const events = new Slickless("#events-carousel", {
    dots: true,
    infinite: false,
    speed: 400,
  });

  function log(kind: string, text: string): void {
    if (!list) return;
    list.querySelector(".event-log__empty")?.remove();
    const li = document.createElement("li");
    li.className = `event-log__row event-log__row--${kind}`;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    appendSpan(li, "event-log__time", time);
    appendSpan(li, "event-log__name", kind);
    appendSpan(li, "event-log__detail", text);
    list.prepend(li);
    while (list.children.length > 12) list.lastElementChild?.remove();
  }

  events.on("init", () => log("init", "carousel ready"));
  events.on<{ currentSlide: number; nextSlide: number }>("beforeChange", (d) =>
    log("beforeChange", `${d.currentSlide} → ${d.nextSlide}`),
  );
  events.on<{ currentSlide: number }>("afterChange", (d) =>
    log("afterChange", `now on ${d.currentSlide}`),
  );
  events.on<{ direction: string }>("swipe", (d) => log("swipe", d.direction));
  events.on<{ direction: string }>("edge", (d) => log("edge", d.direction));

  clearBtn?.addEventListener("click", () => {
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    const empty = document.createElement("li");
    empty.className = "event-log__empty";
    empty.textContent = "No events yet. Try the arrows or a swipe.";
    list.appendChild(empty);
  });
}
