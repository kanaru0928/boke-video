export function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(Math.trunc(totalSeconds), 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
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
