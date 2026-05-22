import OBSWebSocket, { type OBSRequestTypes } from "obs-websocket-js";
import {
  buildObsWebsocketUrl,
  normalizeObsWebsocketPassword,
  type ObsWebsocketConnectionSettings,
} from "./obs_websocket_connection";

type ConfigureObsWhipStreamInput = {
  bearerToken: string;
  obsWebsocketConnection: ObsWebsocketConnectionSettings;
  serverUrl: string;
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
  obsWebsocketConnection,
  serverUrl,
}: ConfigureObsWhipStreamInput): Promise<void> {
  const obs = new OBSWebSocket();

  try {
    await obs.connect(
      buildObsWebsocketUrl(obsWebsocketConnection),
      normalizeObsWebsocketPassword(obsWebsocketConnection.serverPassword),
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
