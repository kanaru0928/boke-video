export type CommentDirection =
  | "rightToLeft"
  | "leftToRight"
  | "topToBottom"
  | "bottomToTop"
  | "fixedTop"
  | "fixedBottom";

export type CommentFontSize = "small" | "medium" | "large";

export type CommentMessage = {
  type: "comment";
  roomId: string;
  commentId: string;
  body: string;
  direction: CommentDirection;
  color: string;
  fontSize: CommentFontSize;
  sentAt: string;
};

export type CommentCreateRequest = {
  body: string;
  direction: CommentDirection;
  color: string;
  fontSize: CommentFontSize;
};

export const commentDirections: CommentDirection[] = [
  "rightToLeft",
  "leftToRight",
  "topToBottom",
  "bottomToTop",
  "fixedTop",
  "fixedBottom",
];

export const commentColors = [
  "#ffffff",
  "#ff5252",
  "#ffd740",
  "#69f0ae",
  "#40c4ff",
  "#e040fb",
] as const;
