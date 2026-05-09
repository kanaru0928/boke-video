export type CommentPosition =
  | { property: "top"; value: string }
  | { property: "bottom"; value: string }
  | { property: "left"; value: string };

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

export function horizontalLaneTop(
  laneIndex: number,
  containerHeight: number,
): CommentPosition {
  const laneCount = Math.max(1, Math.floor(containerHeight / laneHeight));
  return {
    property: "top",
    value: `${(laneIndex % laneCount) * laneHeight}px`,
  };
}

export function verticalLaneLeft(
  laneIndex: number,
  containerWidth: number,
): CommentPosition {
  const laneCount = Math.max(1, Math.floor(containerWidth / laneWidth));
  return {
    property: "left",
    value: `${(laneIndex % laneCount) * laneWidth}px`,
  };
}
