import type { CommentMessage } from "./types";

const pcLimit = 120;
const tabletLimit = 80;
const mobileLimit = 45;

export class CommentRenderer {
  private readonly active = new Set<HTMLElement>();
  private horizontalLane = 0;
  private verticalLane = 0;

  constructor(private readonly root: HTMLElement) {}

  render(message: CommentMessage): void {
    while (this.active.size >= this.limit()) {
      const first = this.active.values().next().value;
      if (first instanceof HTMLElement) {
        first.remove();
        this.active.delete(first);
      } else {
        break;
      }
    }

    const element = document.createElement("div");
    element.className = `comment comment-${message.direction} comment-size-${message.fontSize}`;
    element.textContent = message.body;
    element.style.color = message.color;
    this.position(element, message.direction);

    element.addEventListener("animationend", () => {
      element.remove();
      this.active.delete(element);
    });

    this.active.add(element);
    this.root.append(element);
  }

  clear(): void {
    for (const element of this.active) {
      element.remove();
    }
    this.active.clear();
  }

  private limit(): number {
    const width = window.innerWidth;
    if (width < 640) {
      return mobileLimit;
    }
    if (width < 1024) {
      return tabletLimit;
    }
    return pcLimit;
  }

  private position(
    element: HTMLElement,
    direction: CommentMessage["direction"],
  ): void {
    const laneHeight = 34;
    const laneWidth = 40;
    switch (direction) {
      case "rightToLeft":
      case "leftToRight": {
        const lane =
          this.horizontalLane %
          Math.max(1, Math.floor(this.root.clientHeight / laneHeight));
        this.horizontalLane += 1;
        element.style.top = `${lane * laneHeight}px`;
        break;
      }
      case "topToBottom":
      case "bottomToTop": {
        const lane =
          this.verticalLane %
          Math.max(1, Math.floor(this.root.clientWidth / laneWidth));
        this.verticalLane += 1;
        element.style.left = `${lane * laneWidth}px`;
        break;
      }
      case "fixedTop":
        element.style.top = "12px";
        break;
      case "fixedBottom":
        element.style.bottom = "12px";
        break;
    }
  }
}
