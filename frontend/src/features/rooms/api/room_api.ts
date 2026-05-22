import {
  adminCommentPath,
  adminRoomPath,
  apiRoomPath,
} from "../../../shared/api/endpoints";
import {
  requestJSON,
  requestJSONWithStatus,
  requestOK,
} from "../../../shared/api/http_client";
import type { AppConfig } from "../../../shared/config/config";
import { isCommentMessage } from "../../comments/lib/comment_message";
import type { CommentMessage } from "../../comments/model/types";

export { isCommentMessage } from "../../comments/lib/comment_message";

export type Room = {
  id: string;
  title: string;
  createdAt: string;
  thumbnailUrl: string;
  thumbnailUpdatedAt: string;
  thumbnailRefreshSeconds: number;
  streamStatus: RoomStreamStatus;
  streamStartedAt: string | null;
  streamLastSeenAt: string | null;
  streamEndedAt: string | null;
};

export type RoomStreamStatus = "waiting" | "live" | "ended";

export type RoomStats = {
  roomId: string;
  visitorCount: number;
  commentCount: number;
  currentViewerCount: number;
  maxConcurrentViewerCount: number;
  streamStatus: RoomStreamStatus;
  startedAt: string | null;
  elapsedSeconds: number;
};

type RoomStatsResult =
  | { status: "ok"; stats: RoomStats }
  | { status: "notFound" };

export type CreatedRoom = Room & {
  whipBearerToken: string;
};

type CommentPage = {
  comments: CommentMessage[];
  nextCursor: string | null;
};

type IngestToken = {
  whipBearerToken: string;
};

export async function fetchRooms(config: AppConfig): Promise<Room[]> {
  const parsed = await requestJSON(config, "GET", "/api/rooms");
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRoom);
}

export async function fetchAdminRooms(config: AppConfig): Promise<Room[]> {
  const parsed = await requestJSON(config, "GET", "/api/admin/rooms");
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRoom);
}

export async function createRoom(
  config: AppConfig,
  title: string,
): Promise<CreatedRoom | null> {
  const parsed = await requestJSON(config, "POST", "/api/admin/rooms", {
    title,
  });
  return parseCreatedRoom(parsed);
}

export async function updateRoomTitle(
  config: AppConfig,
  roomId: string,
  title: string,
): Promise<Room | null> {
  const parsed = await requestJSON(config, "PATCH", adminRoomPath(roomId), {
    title,
  });
  return parseRoom(parsed);
}

export async function deleteRoom(
  config: AppConfig,
  roomId: string,
): Promise<boolean> {
  return requestOK(config, "DELETE", adminRoomPath(roomId));
}

export async function rotateRoomIngestToken(
  config: AppConfig,
  roomId: string,
): Promise<IngestToken | null> {
  const parsed = await requestJSON(
    config,
    "POST",
    adminRoomPath(roomId, "/ingest-token"),
  );
  return parseIngestToken(parsed);
}

export async function deleteComment(
  config: AppConfig,
  commentId: string,
): Promise<boolean> {
  return requestOK(config, "DELETE", adminCommentPath(commentId));
}

export async function fetchCommentPage(
  config: AppConfig,
  roomId: string,
  cursor: string | null = null,
): Promise<CommentPage> {
  const query = new URLSearchParams();
  if (cursor !== null) {
    query.set("cursor", cursor);
  }
  const suffix = query.size === 0 ? "/comments" : `/comments?${query}`;
  const parsed = await requestJSON(config, "GET", apiRoomPath(roomId, suffix));
  if (!isCommentPage(parsed)) {
    return { comments: [], nextCursor: null };
  }
  return {
    comments: parsed.comments,
    nextCursor: parsed.nextCursor === "" ? null : parsed.nextCursor,
  };
}

export async function fetchRoomStatsResult(
  config: AppConfig,
  roomId: string,
): Promise<RoomStatsResult> {
  return requestRoomStats(config, "GET", apiRoomPath(roomId, "/stats"));
}

export async function createRoomVisitResult(
  config: AppConfig,
  roomId: string,
): Promise<RoomStatsResult> {
  return requestRoomStats(config, "POST", apiRoomPath(roomId, "/visits"));
}

async function requestRoomStats(
  config: AppConfig,
  method: "GET" | "POST",
  path: string,
): Promise<RoomStatsResult> {
  const response = await requestJSONWithStatus(config, method, path);
  if (response.status === 404) {
    return { status: "notFound" };
  }
  return { status: "ok", stats: requireRoomStats(response.value) };
}

export function isRoom(value: unknown): value is Room {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const room = value as Record<string, unknown>;
  return (
    typeof room.id === "string" &&
    typeof room.title === "string" &&
    typeof room.createdAt === "string" &&
    typeof room.thumbnailUrl === "string" &&
    typeof room.thumbnailUpdatedAt === "string" &&
    typeof room.thumbnailRefreshSeconds === "number" &&
    Number.isInteger(room.thumbnailRefreshSeconds) &&
    isRoomStreamStatus(room.streamStatus) &&
    isNullableString(room.streamStartedAt) &&
    isNullableString(room.streamLastSeenAt) &&
    isNullableString(room.streamEndedAt)
  );
}

export function isRoomStats(value: unknown): value is RoomStats {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const stats = value as Record<string, unknown>;
  return (
    typeof stats.roomId === "string" &&
    typeof stats.visitorCount === "number" &&
    Number.isInteger(stats.visitorCount) &&
    typeof stats.commentCount === "number" &&
    Number.isInteger(stats.commentCount) &&
    typeof stats.currentViewerCount === "number" &&
    Number.isInteger(stats.currentViewerCount) &&
    typeof stats.maxConcurrentViewerCount === "number" &&
    Number.isInteger(stats.maxConcurrentViewerCount) &&
    isRoomStreamStatus(stats.streamStatus) &&
    isNullableString(stats.startedAt) &&
    typeof stats.elapsedSeconds === "number" &&
    Number.isInteger(stats.elapsedSeconds)
  );
}

function isRoomStreamStatus(value: unknown): value is RoomStreamStatus {
  return value === "waiting" || value === "live" || value === "ended";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isCreatedRoom(value: unknown): value is CreatedRoom {
  if (!isRoom(value)) {
    return false;
  }
  const room = value as Record<string, unknown>;
  return typeof room.whipBearerToken === "string";
}

function isIngestToken(value: unknown): value is IngestToken {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const token = value as Record<string, unknown>;
  return typeof token.whipBearerToken === "string";
}

function isCommentPage(value: unknown): value is CommentPage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const page = value as Record<string, unknown>;
  return (
    Array.isArray(page.comments) &&
    page.comments.every(isCommentMessage) &&
    (typeof page.nextCursor === "string" || page.nextCursor === null)
  );
}

function parseRoom(value: unknown): Room | null {
  if (!isRoom(value)) {
    return null;
  }
  return value;
}

function parseCreatedRoom(value: unknown): CreatedRoom | null {
  if (!isCreatedRoom(value)) {
    return null;
  }
  return value;
}

function parseRoomStats(value: unknown): RoomStats | null {
  if (!isRoomStats(value)) {
    return null;
  }
  return value;
}

function requireRoomStats(value: unknown): RoomStats {
  const stats = parseRoomStats(value);
  if (stats === null) {
    throw new Error("room stats response was invalid");
  }
  return stats;
}

function parseIngestToken(value: unknown): IngestToken | null {
  if (!isIngestToken(value)) {
    return null;
  }
  return value;
}
