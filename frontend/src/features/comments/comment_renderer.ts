import {
  type CommentPosition,
  commentLimit,
  horizontalLaneTop,
  verticalLaneLeft,
} from "./comment_layout";
import { commentClassName } from "./comment_styles";
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
    element.className = commentClassName(message.direction, message.fontSize);
    element.textContent = message.body;
    element.style.color = message.color;
    this.position(element, message.direction);

    this.active.add(element);
    this.root.append(element);

    const animation = startCommentAnimation(
      element,
      message.direction,
      this.root,
    );
    void animation.finished.finally(() => {
      element.remove();
      this.active.delete(element);
    });
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

function startCommentAnimation(
  element: HTMLElement,
  direction: CommentMessage["direction"],
  root: HTMLElement,
): Animation {
  switch (direction) {
    case "rightToLeft":
      return element.animate(
        [
          { transform: "translateX(0)" },
          {
            transform: `translateX(-${root.clientWidth + element.clientWidth}px)`,
          },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "leftToRight":
      return element.animate(
        [
          { transform: "translateX(0)" },
          {
            transform: `translateX(${root.clientWidth + element.clientWidth}px)`,
          },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "topToBottom":
      return element.animate(
        [
          { transform: "translateY(-100%)" },
          {
            transform: `translateY(${root.clientHeight + element.clientHeight}px)`,
          },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "bottomToTop":
      return element.animate(
        [
          { transform: "translateY(100%)" },
          {
            transform: `translateY(-${root.clientHeight + element.clientHeight}px)`,
          },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "fixedTop":
    case "fixedBottom":
      return element.animate(
        [
          { opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { opacity: 1, offset: 0.85 },
          { opacity: 0 },
        ],
        {
          duration: 4000,
          easing: "linear",
          fill: "forwards",
        },
      );
  }
}
