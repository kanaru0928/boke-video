import type { RoomStreamStatus } from "../../rooms/api/room_api";

export function streamStatusMessage(streamStatus: RoomStreamStatus): string {
  if (streamStatus === "ended") {
    return "配信は終了しました";
  }
  return "配信を準備しています";
}

export function playerStatusMessage(
  streamStatus: RoomStreamStatus,
  streamMessage: string,
): string {
  if (streamStatus === "ended") {
    return streamStatusMessage(streamStatus);
  }
  return streamMessage;
}

export function streamStatusLabel(streamStatus: RoomStreamStatus): string {
  if (streamStatus === "live") {
    return "ON AIR";
  }
  if (streamStatus === "ended") {
    return "配信終了";
  }
  return "準備中";
}
