import type { AppConfig } from "../../shared/config/config";

type StreamAccess = {
  playbackUrl: string;
};

export async function fetchStreamAccess(
  config: AppConfig,
  roomId: string,
): Promise<StreamAccess | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/rooms/${encodeURIComponent(roomId)}/stream-access`,
    {
      credentials: "include",
      method: "POST",
    },
  );
  if (!response.ok) {
    return null;
  }
  const parsed: unknown = await response.json();
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
