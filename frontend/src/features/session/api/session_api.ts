import { apiEndpoint } from "../../../shared/api/endpoints";
import type { AppConfig } from "../../../shared/config/config";

export async function establishSession(config: AppConfig): Promise<void> {
  const response = await fetch(apiEndpoint(config, "/api/sessions"), {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`session establishment failed: ${response.status}`);
  }
}
