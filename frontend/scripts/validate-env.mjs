import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const requiredNames = [
  "VITE_API_BASE_URL",
  "VITE_COMMENT_WS_URL",
  "VITE_INGEST_BASE_URL",
];

const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...readEnvFile(".env.production"),
  ...process.env,
};

const missingNames = requiredNames.filter((name) => envValue(env, name) === "");

if (missingNames.length > 0) {
  throw new Error(`missing frontend env: ${missingNames.join(", ")}`);
}

function readEnvFile(relativePath) {
  const filePath = path.resolve(process.cwd(), relativePath);
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    env[key] = unquote(value);
  }
  return env;
}

function envValue(env, name) {
  return (env[name] ?? "").trim();
}

function unquote(value) {
  const doubleQuote = String.fromCharCode(34);
  if (
    (value.startsWith(doubleQuote) && value.endsWith(doubleQuote)) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
