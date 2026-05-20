import type { CommentMessage } from "../comments/types";

export function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(Math.trunc(totalSeconds), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function commentLogNumber(
  commentIndex: number,
  visibleCommentCount: number,
  totalCommentCount: number,
): number {
  const firstVisibleNumber = Math.max(
    totalCommentCount - visibleCommentCount,
    0,
  );
  return firstVisibleNumber + commentIndex + 1;
}

export function appendRecentComment(
  comments: CommentMessage[],
  comment: CommentMessage,
  maxComments: number,
): CommentMessage[] {
  return [...comments, comment].slice(
    Math.max(comments.length + 1 - maxComments, 0),
  );
}
