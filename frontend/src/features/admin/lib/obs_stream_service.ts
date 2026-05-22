import OBSWebSocket, { type OBSRequestTypes } from "obs-websocket-js";

export const defaultObsWebsocketUrl = "ws://127.0.0.1:4455";

type ConfigureObsWhipStreamInput = {
  bearerToken: string;
  serverUrl: string;
  websocketPassword: string;
  websocketUrl: string;
};

export function buildObsWhipStreamServiceSettings(
  serverUrl: string,
  bearerToken: string,
): OBSRequestTypes["SetStreamServiceSettings"] {
  return {
    streamServiceType: "whip_custom",
    streamServiceSettings: {
      bearer_token: bearerToken,
      server: serverUrl,
    },
  };
}

export async function configureObsWhipStream({
  bearerToken,
  serverUrl,
  websocketPassword,
  websocketUrl,
}: ConfigureObsWhipStreamInput): Promise<void> {
  const obs = new OBSWebSocket();

  try {
    await obs.connect(
      normalizeObsWebsocketUrl(websocketUrl),
      normalizeObsWebsocketPassword(websocketPassword),
    );
    await obs.call(
      "SetStreamServiceSettings",
      buildObsWhipStreamServiceSettings(serverUrl, bearerToken),
    );
  } finally {
    if (obs.identified) {
      try {
        await obs.disconnect();
      } catch {}
    }
  }
}

export function formatObsConnectionError(error: unknown): string {
  if (error instanceof Error && error.message !== "") {
    return error.message;
  }
  return "OBS WebSocketに接続できませんでした。OBSのWebSocket設定、URL、パスワードを確認してください。";
}

function normalizeObsWebsocketUrl(websocketUrl: string): string {
  const trimmedUrl = websocketUrl.trim();
  return trimmedUrl === "" ? defaultObsWebsocketUrl : trimmedUrl;
}

function normalizeObsWebsocketPassword(
  websocketPassword: string,
): string | undefined {
  const trimmedPassword = websocketPassword.trim();
  return trimmedPassword === "" ? undefined : trimmedPassword;
}
