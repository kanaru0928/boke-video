export type CommentPosition =
  | { property: "top"; value: string }
  | { property: "bottom"; value: string }
  | { property: "left"; value: string };

export type CommentLaneAxis = "horizontal" | "vertical";

const pcLimit = 120;
const tabletLimit = 80;
const mobileLimit = 45;
const laneHeight = 34;
const laneWidth = 40;

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

export function horizontalLaneCount(containerHeight: number): number {
  return Math.max(1, Math.floor(containerHeight / laneHeight));
}

export function horizontalLaneTop(
  laneIndex: number,
  containerHeight: number,
): CommentPosition {
  return {
    property: "top",
    value: `${(laneIndex % horizontalLaneCount(containerHeight)) * laneHeight}px`,
  };
}

export function verticalLaneCount(containerWidth: number): number {
  return Math.max(1, Math.floor(containerWidth / laneWidth));
}

export function verticalLaneLeft(
  laneIndex: number,
  containerWidth: number,
): CommentPosition {
  return {
    property: "left",
    value: `${(laneIndex % verticalLaneCount(containerWidth)) * laneWidth}px`,
  };
}
