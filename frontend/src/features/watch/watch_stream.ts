import type { RoomStreamStatus } from "../rooms/room_api";

export function streamStatusMessage(streamStatus: RoomStreamStatus): string {
  if (streamStatus === "ended") {
    return "配信は終了しました";
  }
  return "配信を準備しています";
}
