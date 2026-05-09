import type { RoomStreamStatus } from "../rooms/room_api";

export function canPlayStream(status: RoomStreamStatus | null): boolean {
  return status?.stream === "ready" || status?.stream === "stale";
}

export function streamStatusMessage(
  status: RoomStreamStatus["stream"] | "unknown",
): string {
  switch (status) {
    case "ready":
      return "";
    case "stale":
      return "配信が停止しています";
    case "missing":
    case "unknown":
      return "配信はまだ開始されていません";
  }
}
