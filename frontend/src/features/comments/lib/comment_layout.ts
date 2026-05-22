import type { CommentFontSize } from "../model/types";

export type CommentPosition =
  | { property: "top"; value: string }
  | { property: "bottom"; value: string }
  | { property: "left"; value: string };

export type CommentLaneAxis = "horizontal" | "vertical";

const pcLimit = 120;
const tabletLimit = 80;
const mobileLimit = 45;
const horizontalLaneCounts: Record<CommentFontSize, number> = {
  small: 18,
  medium: 14,
  large: 11,
};
const verticalLaneCounts: Record<CommentFontSize, number> = {
  small: 24,
  medium: 18,
  large: 14,
};

export function commentLimit(viewportWidth: number): number {
  if (viewportWidth < 640) {
    return mobileLimit;
  }
  if (viewportWidth < 1024) {
    return tabletLimit;
  }
  return pcLimit;
}

export class CommentLaneAllocator {
  private readonly occupiedLanes: Record<CommentLaneAxis, Map<number, number>> =
    {
      horizontal: new Map<number, number>(),
      vertical: new Map<number, number>(),
    };

  acquire(axis: CommentLaneAxis, laneCount: number): number {
    const normalizedLaneCount = Math.max(1, laneCount);
    const occupied = this.occupiedLanes[axis];

    for (let lane = 0; lane < normalizedLaneCount; lane += 1) {
      if (!occupied.has(lane)) {
        this.occupy(axis, lane);
        return lane;
      }
    }

    const lane = leastOccupiedLane(occupied, normalizedLaneCount);
    this.occupy(axis, lane);
    return lane;
  }

  release(axis: CommentLaneAxis, lane: number): void {
    const occupied = this.occupiedLanes[axis];
    const count = occupied.get(lane);
    if (count === undefined) {
      return;
    }
    if (count <= 1) {
      occupied.delete(lane);
      return;
    }
    occupied.set(lane, count - 1);
  }

  clear(): void {
    this.occupiedLanes.horizontal.clear();
    this.occupiedLanes.vertical.clear();
  }

  private occupy(axis: CommentLaneAxis, lane: number): void {
    const occupied = this.occupiedLanes[axis];
    occupied.set(lane, (occupied.get(lane) ?? 0) + 1);
  }
}

function leastOccupiedLane(
  occupied: Map<number, number>,
  laneCount: number,
): number {
  let selectedLane = 0;
  let selectedCount = occupied.get(0) ?? 0;
  for (let lane = 1; lane < laneCount; lane += 1) {
    const count = occupied.get(lane) ?? 0;
    if (count < selectedCount) {
      selectedLane = lane;
      selectedCount = count;
    }
  }
  return selectedLane;
}

export function horizontalLaneCount(
  containerHeight: number,
  fontSize: CommentFontSize = "medium",
): number {
  if (containerHeight <= 0) {
    return 1;
  }
  return horizontalLaneCounts[fontSize];
}

export function horizontalLaneTop(
  laneIndex: number,
  containerHeight: number,
  fontSize: CommentFontSize = "medium",
): CommentPosition {
  const laneCount = horizontalLaneCount(containerHeight, fontSize);
  const laneHeight = containerHeight / laneCount;
  return {
    property: "top",
    value: formatPixels((laneIndex % laneCount) * laneHeight),
  };
}

export function verticalLaneCount(
  containerWidth: number,
  fontSize: CommentFontSize = "medium",
): number {
  if (containerWidth <= 0) {
    return 1;
  }
  return verticalLaneCounts[fontSize];
}

export function verticalLaneLeft(
  laneIndex: number,
  containerWidth: number,
  fontSize: CommentFontSize = "medium",
): CommentPosition {
  const laneCount = verticalLaneCount(containerWidth, fontSize);
  const laneWidth = containerWidth / laneCount;
  return {
    property: "left",
    value: formatPixels((laneIndex % laneCount) * laneWidth),
  };
}

export function commentFontSizePixels(
  containerHeight: number,
  fontSize: CommentFontSize,
): number {
  const laneCount = horizontalLaneCount(containerHeight, fontSize);
  return (containerHeight / laneCount) * 0.8;
}

export function commentEdgeOffsetPixels(containerHeight: number): number {
  return containerHeight * 0.025;
}

function formatPixels(value: number): string {
  return `${Number(value.toFixed(3))}px`;
}
