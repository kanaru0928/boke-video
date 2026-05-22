import {
  CommentLaneAllocator,
  type CommentLaneAxis,
  type CommentPosition,
  commentEdgeOffsetPixels,
  commentFontSizePixels,
  commentLimit,
  horizontalLaneCount,
  horizontalLaneTop,
  verticalLaneCount,
  verticalLaneLeft,
} from "../lib/comment_layout";
import type { CommentMessage } from "../model/types";
import { commentClassName } from "./comment_styles";

export class CommentRenderer {
  private readonly active = new Set<HTMLElement>();
  private readonly laneAllocator = new CommentLaneAllocator();

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
    element.className = commentClassName(message.direction);
    element.textContent = message.body;
    element.style.color = message.color;
    element.style.fontSize = `${commentFontSizePixels(
      this.root.clientHeight,
      message.fontSize,
    )}px`;
    if (isMovingComment(message.direction)) {
      element.style.maxWidth = "none";
      element.style.width = "max-content";
    }
    const occupiedLane = this.position(
      element,
      message.direction,
      message.fontSize,
    );

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
      if (occupiedLane !== null) {
        this.laneAllocator.release(occupiedLane.axis, occupiedLane.lane);
      }
    });
  }

  clear(): void {
    for (const element of this.active) {
      element.remove();
    }
    this.active.clear();
    this.laneAllocator.clear();
  }

  private limit(): number {
    return commentLimit(window.innerWidth);
  }

  private position(
    element: HTMLElement,
    direction: CommentMessage["direction"],
    fontSize: CommentMessage["fontSize"],
  ): OccupiedCommentLane | null {
    switch (direction) {
      case "rightToLeft":
      case "leftToRight": {
        const lane = this.laneAllocator.acquire(
          "horizontal",
          horizontalLaneCount(this.root.clientHeight, fontSize),
        );
        const position = horizontalLaneTop(
          lane,
          this.root.clientHeight,
          fontSize,
        );
        applyPosition(element, position);
        return { axis: "horizontal", lane };
      }
      case "topToBottom":
      case "bottomToTop": {
        const lane = this.laneAllocator.acquire(
          "vertical",
          verticalLaneCount(this.root.clientWidth, fontSize),
        );
        const position = verticalLaneLeft(
          lane,
          this.root.clientWidth,
          fontSize,
        );
        applyPosition(element, position);
        return { axis: "vertical", lane };
      }
      case "fixedTop":
        element.style.top = `${commentEdgeOffsetPixels(this.root.clientHeight)}px`;
        return null;
      case "fixedBottom":
        element.style.bottom = `${commentEdgeOffsetPixels(
          this.root.clientHeight,
        )}px`;
        return null;
    }
  }
}

function isMovingComment(direction: CommentMessage["direction"]): boolean {
  return (
    direction === "rightToLeft" ||
    direction === "leftToRight" ||
    direction === "topToBottom" ||
    direction === "bottomToTop"
  );
}

type OccupiedCommentLane = {
  axis: CommentLaneAxis;
  lane: number;
};

function applyPosition(element: HTMLElement, position: CommentPosition): void {
  element.style[position.property] = position.value;
}

function startCommentAnimation(
  element: HTMLElement,
  direction: CommentMessage["direction"],
  root: HTMLElement,
): Animation {
  const travelWidth = root.clientWidth + element.scrollWidth;
  const travelHeight = root.clientHeight + element.scrollHeight;
  switch (direction) {
    case "rightToLeft":
      return element.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(-${travelWidth}px)` },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "leftToRight":
      return element.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${travelWidth}px)` },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "topToBottom":
      return element.animate(
        [
          { transform: "translateY(-100%)" },
          { transform: `translateY(${travelHeight}px)` },
        ],
        { duration: 6000, easing: "linear", fill: "forwards" },
      );
    case "bottomToTop":
      return element.animate(
        [
          { transform: "translateY(100%)" },
          { transform: `translateY(-${travelHeight}px)` },
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
