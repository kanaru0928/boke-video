export type AppConfig = {
  apiBaseUrl: string;
  commentWsUrl: string;
  ingestBaseUrl: string;
  accessEnabled: boolean;
};

function requiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const appConfig: AppConfig = {
  apiBaseUrl: requiredEnv("VITE_API_BASE_URL"),
  commentWsUrl: requiredEnv("VITE_COMMENT_WS_URL"),
  ingestBaseUrl: requiredEnv("VITE_INGEST_BASE_URL"),
  accessEnabled: import.meta.env.VITE_ACCESS_ENABLED !== "false",
};
