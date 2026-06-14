import type { AppConfig } from "../config/config";
import { apiEndpoint } from "./endpoints";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export async function requestJSON(
  config: AppConfig,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<unknown | null> {
  const response = await request(config, method, path, body);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function requestJSONWithStatus(
  config: AppConfig,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<{ status: number; value: unknown | null }> {
  const response = await request(config, method, path, body);
  if (!response.ok) {
    return { status: response.status, value: null };
  }
  const contentType = response.headers.get("content-type");
  const value = contentType?.includes("application/json")
    ? await response.json()
    : null;
  return { status: response.status, value };
}

export async function requestOK(
  config: AppConfig,
  method: HttpMethod,
  path: string,
): Promise<boolean> {
  const response = await request(config, method, path);
  return response.ok;
}

async function request(
  config: AppConfig,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(apiEndpoint(config, path), {
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    method,
  });
}
