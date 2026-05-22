export { formatElapsedTime } from "../../../shared/lib/elapsed_time";

export function formatCommentSentAt(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
    date.getSeconds().toString().padStart(2, "0"),
  ].join(":");
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

export function isCommentLogScrolledToBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= 8;
}
