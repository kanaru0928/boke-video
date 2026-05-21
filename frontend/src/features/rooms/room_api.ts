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
  const response = await fetch(`${config.apiBaseUrl}/api/rooms`, {
    credentials: "include",
  });
  if (!response.ok) {
    return [];
  }
  const parsed: unknown = await response.json();
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRoom);
}

export async function fetchAdminRooms(config: AppConfig): Promise<Room[]> {
  const response = await fetch(`${config.apiBaseUrl}/api/admin/rooms`, {
    credentials: "include",
  });
  if (!response.ok) {
    return [];
  }
  const parsed: unknown = await response.json();
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRoom);
}

export async function createRoom(
  config: AppConfig,
  title: string,
): Promise<CreatedRoom | null> {
  const response = await fetch(`${config.apiBaseUrl}/api/admin/rooms`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  return parseCreatedRoomResponse(response);
}

export async function updateRoomTitle(
  config: AppConfig,
  roomId: string,
  title: string,
): Promise<Room | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/admin/rooms/${encodeURIComponent(roomId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    },
  );
  return parseRoomResponse(response);
}

export async function deleteRoom(
  config: AppConfig,
  roomId: string,
): Promise<boolean> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/admin/rooms/${encodeURIComponent(roomId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  return response.ok;
}

export async function rotateRoomIngestToken(
  config: AppConfig,
  roomId: string,
): Promise<IngestToken | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/admin/rooms/${encodeURIComponent(roomId)}/ingest-token`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  return parseIngestTokenResponse(response);
}

export async function deleteComment(
  config: AppConfig,
  commentId: string,
): Promise<boolean> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/admin/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  return response.ok;
}

export async function fetchComments(
  config: AppConfig,
  roomId: string,
): Promise<CommentMessage[]> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/rooms/${encodeURIComponent(roomId)}/comments?limit=60`,
    {
      credentials: "include",
    },
  );
  if (!response.ok) {
    return [];
  }
  const parsed: unknown = await response.json();
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isCommentMessage);
}

export async function fetchRoomStats(
  config: AppConfig,
  roomId: string,
): Promise<RoomStats | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/rooms/${encodeURIComponent(roomId)}/stats`,
    {
      credentials: "include",
    },
  );
  return parseRoomStatsResponse(response);
}

export async function createRoomVisit(
  config: AppConfig,
  roomId: string,
): Promise<RoomStats | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/rooms/${encodeURIComponent(roomId)}/visits`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  return parseRoomStatsResponse(response);
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

async function parseRoomResponse(response: Response): Promise<Room | null> {
  if (!response.ok) {
    return null;
  }
  const parsed: unknown = await response.json();
  if (!isRoom(parsed)) {
    return null;
  }
  return parsed;
}

async function parseCreatedRoomResponse(
  response: Response,
): Promise<CreatedRoom | null> {
  if (!response.ok) {
    return null;
  }
  const parsed: unknown = await response.json();
  if (!isCreatedRoom(parsed)) {
    return null;
  }
  return parsed;
}

async function parseRoomStatsResponse(
  response: Response,
): Promise<RoomStats | null> {
  if (!response.ok) {
    return null;
  }
  const parsed: unknown = await response.json();
  if (!isRoomStats(parsed)) {
    return null;
  }
  return parsed;
}

async function parseIngestTokenResponse(
  response: Response,
): Promise<IngestToken | null> {
  if (!response.ok) {
    return null;
  }
  const parsed: unknown = await response.json();
  if (!isIngestToken(parsed)) {
    return null;
  }
  return parsed;
}
