import {
  type CommentPosition,
  commentLimit,
  horizontalLaneTop,
  verticalLaneLeft,
} from "./comment_layout";
import type { CommentMessage } from "./types";

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
    element.style.setProperty(
      "--comment-travel-x",
      `${this.root.clientWidth}px`,
    );
    element.style.setProperty(
      "--comment-travel-y",
      `${this.root.clientHeight}px`,
    );
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
    return commentLimit(window.innerWidth);
  }

  private position(
    element: HTMLElement,
    direction: CommentMessage["direction"],
  ): void {
    switch (direction) {
      case "rightToLeft":
      case "leftToRight": {
        const position = horizontalLaneTop(
          this.horizontalLane,
          this.root.clientHeight,
        );
        this.horizontalLane += 1;
        applyPosition(element, position);
        break;
      }
      case "topToBottom":
      case "bottomToTop": {
        const position = verticalLaneLeft(
          this.verticalLane,
          this.root.clientWidth,
        );
        this.verticalLane += 1;
        applyPosition(element, position);
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

function applyPosition(element: HTMLElement, position: CommentPosition): void {
  element.style[position.property] = position.value;
}
