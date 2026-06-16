/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COMMENT_WS_URL: string;
  readonly VITE_INGEST_BASE_URL: string;
  readonly VITE_ACCESS_ENABLED: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
