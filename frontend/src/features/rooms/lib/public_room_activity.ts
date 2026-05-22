export function formatStartedAgo(totalSeconds: number): string {
  const safeMinutes = Math.floor(Math.max(Math.trunc(totalSeconds), 0) / 60);
  if (safeMinutes < 1) {
    return "1分未満前に開始";
  }
  if (safeMinutes < 60) {
    return `${safeMinutes}分前に開始`;
  }
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (minutes === 0) {
    return `${hours}時間前に開始`;
  }
  return `${hours}時間${minutes}分前に開始`;
}
