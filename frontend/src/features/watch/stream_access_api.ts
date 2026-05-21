import { apiRoomPath } from "../../shared/api/endpoints";
import { requestJSON } from "../../shared/api/http_client";
import type { AppConfig } from "../../shared/config/config";

type StreamAccess = {
  playbackUrl: string;
  playbackVariants?: StreamPlaybackVariant[];
};

export type StreamPlaybackVariant = {
  id: string;
  label: string;
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
    streamAccess.playbackUrl !== "" &&
    isStreamPlaybackVariants(streamAccess.playbackVariants)
  );
}

function isStreamPlaybackVariants(
  value: unknown,
): value is StreamPlaybackVariant[] {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(isStreamPlaybackVariant);
}

function isStreamPlaybackVariant(
  value: unknown,
): value is StreamPlaybackVariant {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const variant = value as Record<string, unknown>;
  return (
    typeof variant.id === "string" &&
    variant.id !== "" &&
    typeof variant.label === "string" &&
    variant.label !== "" &&
    typeof variant.playbackUrl === "string" &&
    variant.playbackUrl !== ""
  );
}
