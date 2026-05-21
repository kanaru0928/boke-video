import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mode = process.argv[2];

if (mode !== "local" && mode !== "production") {
  throw new Error("usage: node scripts/env-sync.mjs local|production");
}

const sourcePath = path.join(
  rootDir,
  mode === "local" ? ".env.local" : ".env.production",
);
const source = readEnvFile(sourcePath);

if (mode === "local") {
  syncLocal(source);
} else {
  syncProduction(source);
}

function syncLocal(env) {
  const databasePath = envValue(
    env,
    "DATABASE_PATH",
    "cc-docs/boke-video-local.sqlite3",
  );
  const streamSigningSecret = envValue(
    env,
    "STREAM_SIGNING_SECRET",
    "local-stream-signing-secret",
  );
  const omeApiAccessToken = envValue(
    env,
    "OME_API_ACCESS_TOKEN",
    "local-api-token",
  );

  writeEnv("backend/.env", {
    LISTEN_ADDR: "127.0.0.1:8080",
    DATABASE_PATH: path.isAbsolute(databasePath)
      ? databasePath
      : path.join(rootDir, databasePath),
    ALLOWED_ORIGINS: "http://localhost:5173,http://127.0.0.1:5173",
    ACCESS_ENABLED: "false",
    STREAM_PUBLIC_BASE_URL: "http://127.0.0.1:3333",
    STREAM_SIGNING_SECRET: streamSigningSecret,
    WHIP_UPSTREAM_BASE_URL: "http://127.0.0.1:3333",
    OME_API_BASE_URL: "http://127.0.0.1:8081",
    OME_API_ACCESS_TOKEN: omeApiAccessToken,
    OME_VHOST_NAME: "default",
    OME_APP_NAME: "live",
    OME_THUMBNAIL_BASE_URL: "http://127.0.0.1:20080",
    OME_THUMBNAIL_CODEC: "jpg",
    STREAM_END_GRACE_SECONDS: "90",
  });

  writeEnv("frontend/.env", {
    VITE_API_BASE_URL: "http://127.0.0.1:8080",
    VITE_COMMENT_WS_URL: "ws://127.0.0.1:8080",
    VITE_INGEST_BASE_URL: "http://127.0.0.1:8080",
  });

  console.log("synced local env");
}

function syncProduction(env) {
  const appDomain = required(env, "APP_DOMAIN");
  const accessTeamName = required(env, "CLOUDFLARE_ACCESS_TEAM_NAME");
  const streamSigningSecret = required(env, "STREAM_SIGNING_SECRET");
  const omeApiAccessToken = required(env, "OME_API_ACCESS_TOKEN");
  const frontendHost = `bokevideo.${appDomain}`;
  const streamHost = `stream.${appDomain}`;
  const ingestHost = `ingest.${appDomain}`;
  const rtcHost = `rtc.${appDomain}`;

  writeEnv("frontend/.env.production", {
    VITE_API_BASE_URL: `https://${streamHost}`,
    VITE_COMMENT_WS_URL: `wss://${streamHost}`,
    VITE_INGEST_BASE_URL: `https://${ingestHost}`,
  });

  writeEnv("deploy/backend/backend.env", {
    LISTEN_ADDR: "127.0.0.1:8080",
    DATABASE_PATH: "/var/lib/boke-video/boke-video.sqlite3",
    ALLOWED_ORIGINS: `https://${frontendHost}`,
    ACCESS_ENABLED: "true",
    ACCESS_AUDIENCE: required(env, "CLOUDFLARE_ACCESS_AUDIENCE"),
    ACCESS_ISSUER: `https://${accessTeamName}.cloudflareaccess.com`,
    ACCESS_CERTS_URL: `https://${accessTeamName}.cloudflareaccess.com/cdn-cgi/access/certs`,
    STREAM_PUBLIC_BASE_URL: `https://${rtcHost}`,
    STREAM_SIGNING_SECRET: streamSigningSecret,
    WHIP_UPSTREAM_BASE_URL: "http://127.0.0.1:3333",
    OME_API_BASE_URL: "http://127.0.0.1:8081",
    OME_API_ACCESS_TOKEN: omeApiAccessToken,
    OME_VHOST_NAME: "default",
    OME_APP_NAME: "live",
    OME_THUMBNAIL_BASE_URL: "http://127.0.0.1:20080",
    OME_THUMBNAIL_CODEC: "jpg",
    STREAM_END_GRACE_SECONDS: "90",
  });

  writeEnv("deploy/caddy/caddy.env", {
    INGEST_HOST: ingestHost,
    RTC_HOST: rtcHost,
  });

  writeEnv("deploy/cloudflared/cloudflared.env", {
    TUNNEL_TOKEN: required(env, "CLOUDFLARE_TUNNEL_TOKEN"),
  });

  writeTerraformVars("infra/cloudflare/terraform.tfvars", {
    cloudflare_account_id: required(env, "CLOUDFLARE_ACCOUNT_ID"),
    cloudflare_zone_id: required(env, "CLOUDFLARE_ZONE_ID"),
    zone_name: appDomain,
    oracle_ipv4: required(env, "ORACLE_IPV4"),
    oracle_ipv6: envValue(env, "ORACLE_IPV6", ""),
    cloudflare_access_team_name: accessTeamName,
    viewer_emails: csv(env, "VIEWER_EMAILS"),
    viewer_email_domains: csv(env, "VIEWER_EMAIL_DOMAINS"),
    admin_emails: csv(env, "ADMIN_EMAILS"),
    admin_email_domains: csv(env, "ADMIN_EMAIL_DOMAINS"),
    worker_service_name: envValue(
      env,
      "WORKER_SERVICE_NAME",
      "boke-video-frontend",
    ),
    worker_environment: envValue(env, "WORKER_ENVIRONMENT", ""),
    manage_worker_custom_domain:
      envValue(env, "MANAGE_WORKER_CUSTOM_DOMAIN", "true") === "true",
    tunnel_name: envValue(env, "TUNNEL_NAME", "boke-video"),
  });

  console.log("synced production env");
}

function readEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const values = new Map();
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const index = line.indexOf("=");
    if (index === -1) {
      throw new Error(`invalid env line: ${rawLine}`);
    }
    const key = line.slice(0, index).trim();
    const value = unquote(line.slice(index + 1).trim());
    values.set(key, value);
  }
  return values;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function required(env, key) {
  const value = envValue(env, key, "");
  if (value === "") {
    throw new Error(`${key} is required`);
  }
  return value;
}

function envValue(env, key, defaultValue) {
  const value = env.get(key);
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }
  return value.trim();
}

function csv(env, key) {
  return envValue(env, key, "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
}

function writeEnv(relativePath, values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  writeText(relativePath, `${lines.join("\n")}\n`);
}

function writeTerraformVars(relativePath, values) {
  const lines = Object.entries(values).map(
    ([key, value]) => `${key} = ${terraformValue(value)}`,
  );
  writeText(relativePath, `${lines.join("\n")}\n`);
}

function terraformValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return JSON.stringify(value);
}

function writeText(relativePath, content) {
  const filePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}
