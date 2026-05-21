import { whipIngestEndpoint } from "../../shared/api/endpoints";
import type { AppConfig } from "../../shared/config/config";

export function buildWhipIngestUrl(config: AppConfig, roomId: string): string {
  return whipIngestEndpoint(config, roomId);
}
