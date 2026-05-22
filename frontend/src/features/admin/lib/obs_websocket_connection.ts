export type ObsWebsocketConnectionSettings = {
  serverIp: string;
  serverPassword: string;
  serverPort: string;
};

export const defaultObsWebsocketConnectionSettings: ObsWebsocketConnectionSettings =
  {
    serverIp: "127.0.0.1",
    serverPassword: "",
    serverPort: "4455",
  };

const storageKey = "boke-video:admin:obs-websocket-connection";

export function buildObsWebsocketUrl(
  settings: Pick<ObsWebsocketConnectionSettings, "serverIp" | "serverPort">,
): string {
  const serverIp = normalizeObsWebsocketServerIp(settings.serverIp);
  const serverPort = normalizeObsWebsocketServerPort(settings.serverPort);
  return `ws://${serverIp}:${serverPort}`;
}

export function normalizeObsWebsocketPassword(
  password: string,
): string | undefined {
  const trimmedPassword = password.trim();
  return trimmedPassword === "" ? undefined : trimmedPassword;
}

export function readObsWebsocketConnectionSettings(
  storage: Storage,
): ObsWebsocketConnectionSettings {
  try {
    const value = storage.getItem(storageKey);
    if (value === null) {
      return defaultObsWebsocketConnectionSettings;
    }
    return (
      parseObsWebsocketConnectionSettings(value) ??
      defaultObsWebsocketConnectionSettings
    );
  } catch {
    return defaultObsWebsocketConnectionSettings;
  }
}

export function saveObsWebsocketConnectionSettings(
  storage: Storage,
  settings: ObsWebsocketConnectionSettings,
): void {
  storage.setItem(
    storageKey,
    JSON.stringify({
      serverIp: settings.serverIp.trim(),
      serverPassword: settings.serverPassword,
      serverPort: settings.serverPort.trim(),
    }),
  );
}

function normalizeObsWebsocketServerIp(serverIp: string): string {
  const trimmedIp = serverIp.trim();
  return trimmedIp === ""
    ? defaultObsWebsocketConnectionSettings.serverIp
    : trimmedIp;
}

function normalizeObsWebsocketServerPort(serverPort: string): string {
  const trimmedPort = serverPort.trim();
  return trimmedPort === ""
    ? defaultObsWebsocketConnectionSettings.serverPort
    : trimmedPort;
}

function parseObsWebsocketConnectionSettings(
  value: string,
): ObsWebsocketConnectionSettings | null {
  const parsed: unknown = JSON.parse(value);
  if (!isObsWebsocketConnectionSettings(parsed)) {
    return null;
  }
  return parsed;
}

function isObsWebsocketConnectionSettings(
  value: unknown,
): value is ObsWebsocketConnectionSettings {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "serverIp" in value &&
    typeof value.serverIp === "string" &&
    "serverPassword" in value &&
    typeof value.serverPassword === "string" &&
    "serverPort" in value &&
    typeof value.serverPort === "string"
  );
}
