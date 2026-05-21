import { apiRoomPath } from "../../shared/api/endpoints";
import { requestJSON } from "../../shared/api/http_client";
import type { AppConfig } from "../../shared/config/config";

type StreamAccess = {
  playbackUrl: string;
};

export async function fetchStreamAccess(
  config: AppConfig,
  roomId: string,
): Promise<StreamAccess | null> {
  const parsed = await requestJSON(
    config,
    "POST",
    apiRoomPath(roomId, "/stream-access"),
  );
  if (!isStreamAccess(parsed)) {
    return null;
  }
  return parsed;
}

export function isStreamAccess(value: unknown): value is StreamAccess {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const streamAccess = value as Record<string, unknown>;
  return (
    typeof streamAccess.playbackUrl === "string" &&
    streamAccess.playbackUrl !== ""
  );
}
