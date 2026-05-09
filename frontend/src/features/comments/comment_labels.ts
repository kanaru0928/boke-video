import type { CommentDirection } from "./types";

export function directionLabel(direction: CommentDirection): string {
  switch (direction) {
    case "rightToLeft":
      return "右から左";
    case "leftToRight":
      return "左から右";
    case "topToBottom":
      return "上から下";
    case "bottomToTop":
      return "下から上";
    case "fixedTop":
      return "上固定";
    case "fixedBottom":
      return "下固定";
  }
}
