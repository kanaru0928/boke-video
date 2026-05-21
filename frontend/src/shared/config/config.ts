export type AppConfig = {
  apiBaseUrl: string;
  commentWsUrl: string;
  ingestBaseUrl: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const appConfig: AppConfig = {
  apiBaseUrl,
  commentWsUrl: import.meta.env.VITE_COMMENT_WS_URL ?? "ws://localhost:8080",
  ingestBaseUrl: import.meta.env.VITE_INGEST_BASE_URL ?? apiBaseUrl,
};
