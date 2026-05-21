import { describe, expect, it } from "vitest";
import type { AppConfig } from "../config/config";
import {
  adminCommentPath,
  adminRoomPath,
  apiEndpoint,
  apiRoomPath,
  commentWebSocketEndpoint,
  roomThumbnailEndpoint,
  whipIngestEndpoint,
} from "./endpoints";

const config: AppConfig = {
  apiBaseUrl: "http://localhost:8080",
  commentWsUrl: "ws://localhost:8080",
  ingestBaseUrl: "http://localhost:8080/",
};

describe("endpoints", () => {
  it("APIのURLを組み立てる", () => {
    expect(apiEndpoint(config, "/api/rooms")).toBe(
      "http://localhost:8080/api/rooms",
    );
    expect(apiRoomPath("room id", "/stats")).toBe("/api/rooms/room%20id/stats");
    expect(adminRoomPath("room id", "/ingest-token")).toBe(
      "/api/admin/rooms/room%20id/ingest-token",
    );
    expect(adminCommentPath("comment id")).toBe(
      "/api/admin/comments/comment%20id",
    );
  });

  it("WebSocketとOBS入力のURLを組み立てる", () => {
    expect(commentWebSocketEndpoint(config, "room id")).toBe(
      "ws://localhost:8080/ws/rooms/room%20id/comments",
    );
    expect(whipIngestEndpoint(config, "room id")).toBe(
      "http://localhost:8080/live/room%20id?direction=whip",
    );
  });

  it("サムネイルURLをAPIのホストへ向ける", () => {
    expect(
      roomThumbnailEndpoint(
        config,
        "/api/rooms/room-1/thumbnail",
        "2026-05-21T08:08:06Z",
      ),
    ).toBe(
      "http://localhost:8080/api/rooms/room-1/thumbnail?updated=2026-05-21T08%3A08%3A06Z",
    );
  });
});
