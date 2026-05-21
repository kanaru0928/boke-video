import type { AppConfig } from "../../shared/config/config";

export function buildWhipIngestUrl(config: AppConfig, roomId: string): string {
  const baseUrl = config.ingestBaseUrl.replace(/\/+$/, "");
  return `${baseUrl}/live/${encodeURIComponent(roomId)}?direction=whip`;
}
