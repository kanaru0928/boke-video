import {
  type CommentDirection,
  type CommentFontSize,
  type CommentMessage,
  commentColors,
  commentDirections,
  type OwnerProfileMessage,
  type PresenceMessage,
} from "../model/types";

export function isCommentMessage(value: unknown): value is CommentMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message.type === "comment" &&
    typeof message.commentId === "string" &&
    isCommentAuthor(message.author) &&
    typeof message.body === "string" &&
    typeof message.roomId === "string" &&
    isCommentDirection(message.direction) &&
    isCommentColor(message.color) &&
    isCommentFontSize(message.fontSize) &&
    typeof message.sentAt === "string"
  );
}

export function isPresenceMessage(value: unknown): value is PresenceMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message.type === "presence" &&
    typeof message.roomId === "string" &&
    typeof message.currentViewerCount === "number" &&
    Number.isInteger(message.currentViewerCount) &&
    typeof message.maxConcurrentViewerCount === "number" &&
    Number.isInteger(message.maxConcurrentViewerCount)
  );
}

export function isOwnerProfileMessage(
  value: unknown,
): value is OwnerProfileMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message.type === "ownerProfile" &&
    typeof message.roomId === "string" &&
    typeof message.ownerDisplayName === "string"
  );
}

function isCommentAuthor(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const author = value as Record<string, unknown>;
  return (
    typeof author.subject === "string" && typeof author.displayName === "string"
  );
}

function isCommentDirection(value: unknown): value is CommentDirection {
  return (
    typeof value === "string" &&
    commentDirections.includes(value as CommentDirection)
  );
}

function isCommentColor(value: unknown): boolean {
  return (
    typeof value === "string" && commentColors.some((color) => color === value)
  );
}

function isCommentFontSize(value: unknown): value is CommentFontSize {
  return value === "small" || value === "medium" || value === "large";
}
