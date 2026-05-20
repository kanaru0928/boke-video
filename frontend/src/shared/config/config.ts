export type AppConfig = {
  apiBaseUrl: string;
  commentWsUrl: string;
};

export const appConfig: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  commentWsUrl: import.meta.env.VITE_COMMENT_WS_URL ?? "ws://localhost:8080",
};
