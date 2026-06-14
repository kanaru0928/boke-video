import { apiRoomPath } from "../../../shared/api/endpoints";
import { requestJSONWithStatus } from "../../../shared/api/http_client";
import type { AppConfig } from "../../../shared/config/config";

type StreamAccess = {
  playbackUrl: string;
  playbackVariants?: StreamPlaybackVariant[];
};

export type StreamPlaybackVariant = {
  id: string;
  label: string;
  playbackUrl: string;
};

export type RoomCredential =
  | { type: "password"; value: string }
  | { type: "bypass"; value: string };

type StreamAccessResult =
  | { status: "ok"; access: StreamAccess }
  | { status: "forbidden" }
  | { status: "error" };

export async function fetchStreamAccess(
  config: AppConfig,
  roomId: string,
  credential?: RoomCredential,
): Promise<StreamAccessResult> {
  const body: Record<string, string> = {};
  if (credential?.type === "password") {
    body.password = credential.value;
  } else if (credential?.type === "bypass") {
    body.bypassToken = credential.value;
  }
  const response = await requestJSONWithStatus(
    config,
    "POST",
    apiRoomPath(roomId, "/stream-access"),
    Object.keys(body).length > 0 ? body : undefined,
  );
  if (response.status === 401 || response.status === 403) {
    return { status: "forbidden" };
  }
  if (!isStreamAccess(response.value)) {
    return { status: "error" };
  }
  return { status: "ok", access: response.value };
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
