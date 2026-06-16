import { describe, expect, it } from "vitest";
import type { AppConfig } from "../../../shared/config/config";
import { buildWhipIngestUrl } from "./ingest_url";

describe("buildWhipIngestUrl", () => {
  it("バックエンドのWHIP認証入口URLを組み立てる", () => {
    const config: AppConfig = {
      apiBaseUrl: "http://127.0.0.1:8080",
      commentWsUrl: "ws://127.0.0.1:8080",
      ingestBaseUrl: "http://127.0.0.1:8080/",
      accessEnabled: true,
    };

    expect(buildWhipIngestUrl(config, "room id")).toBe(
      "http://127.0.0.1:8080/live/room%20id?direction=whip",
    );
  });
});
