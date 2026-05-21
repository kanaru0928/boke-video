import {
  adminCommentPath,
  adminRoomPath,
  apiRoomPath,
} from "../../shared/api/endpoints";
import { requestJSON, requestOK } from "../../shared/api/http_client";
import type { AppConfig } from "../../shared/config/config";
import {
  type CommentDirection,
  type CommentFontSize,
  type CommentMessage,
  commentColors,
  commentDirections,
} from "../comments/types";

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
  streamStatus: RoomStreamStatus;
  startedAt: string | null;
  elapsedSeconds: number;
};

export type CreatedRoom = Room & {
  whipBearerToken: string;
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

export async function fetchComments(
  config: AppConfig,
  roomId: string,
): Promise<CommentMessage[]> {
  const parsed = await requestJSON(
    config,
    "GET",
    apiRoomPath(roomId, "/comments?limit=60"),
  );
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isCommentMessage);
}

export async function fetchRoomStats(
  config: AppConfig,
  roomId: string,
): Promise<RoomStats | null> {
  const parsed = await requestJSON(
    config,
    "GET",
    apiRoomPath(roomId, "/stats"),
  );
  return parseRoomStats(parsed);
}

export async function createRoomVisit(
  config: AppConfig,
  roomId: string,
): Promise<RoomStats | null> {
  const parsed = await requestJSON(
    config,
    "POST",
    apiRoomPath(roomId, "/visits"),
  );
  return parseRoomStats(parsed);
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

export function isCommentMessage(value: unknown): value is CommentMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message.type === "comment" &&
    typeof message.commentId === "string" &&
    typeof message.body === "string" &&
    typeof message.roomId === "string" &&
    isCommentDirection(message.direction) &&
    isCommentColor(message.color) &&
    isCommentFontSize(message.fontSize) &&
    typeof message.sentAt === "string"
  );
}

function isCommentDirection(value: unknown): value is CommentDirection {
  return (
    typeof value === "string" &&
    commentDirections.includes(value as CommentDirection)
  );
}

function isCommentColor(value: unknown): boolean {
  return (
    typeof value === "string" && commentColors.some((color) => color === value)
  );
}

function isCommentFontSize(value: unknown): value is CommentFontSize {
  return value === "small" || value === "medium" || value === "large";
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

function parseIngestToken(value: unknown): IngestToken | null {
  if (!isIngestToken(value)) {
    return null;
  }
  return value;
}
