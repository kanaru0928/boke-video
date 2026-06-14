import type { AppConfig } from "../config/config";

export function apiEndpoint(config: AppConfig, path: string): string {
  return joinBaseUrl(config.apiBaseUrl, path);
}

export function apiRoomPath(roomId: string, suffix = ""): string {
  return `/api/rooms/${encodeURIComponent(roomId)}${suffix}`;
}

export function adminRoomPath(roomId: string, suffix = ""): string {
  return `/api/admin/rooms/${encodeURIComponent(roomId)}${suffix}`;
}

export function adminRoomPasswordPath(roomId: string): string {
  return `/api/admin/rooms/${encodeURIComponent(roomId)}/password`;
}

export function adminRoomBypassTokenPath(roomId: string): string {
  return `/api/admin/rooms/${encodeURIComponent(roomId)}/bypass-token`;
}

export function adminCommentPath(commentId: string): string {
  return `/api/admin/comments/${encodeURIComponent(commentId)}`;
}

export function commentWebSocketEndpoint(
  config: AppConfig,
  roomId: string,
): string {
  return joinBaseUrl(
    config.commentWsUrl,
    `/ws/rooms/${encodeURIComponent(roomId)}/comments`,
  );
}

export function whipIngestEndpoint(config: AppConfig, roomId: string): string {
  return joinBaseUrl(
    config.ingestBaseUrl,
    `/live/${encodeURIComponent(roomId)}?direction=whip`,
  );
}

export function roomThumbnailEndpoint(
  config: AppConfig,
  thumbnailPath: string,
  updatedAt: string,
): string {
  const url = new URL(thumbnailPath, normalizedBaseUrl(config.apiBaseUrl));
  url.searchParams.set("updated", updatedAt);
  return url.toString();
}

function joinBaseUrl(baseUrl: string, path: string): string {
  return new URL(path, normalizedBaseUrl(baseUrl)).toString();
}

function normalizedBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
