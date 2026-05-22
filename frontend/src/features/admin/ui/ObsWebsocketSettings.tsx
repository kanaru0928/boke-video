import { Cable, Save } from "lucide-react";
import { Board } from "../../../shared/ui/Board";
import { Button } from "../../../shared/ui/Button";
import { TextInput } from "../../../shared/ui/FormControl";
import type { ObsWebsocketConnectionSettings } from "../lib/obs_websocket_connection";

type ObsWebsocketSettingsProps = {
  obsWebsocketConnection: ObsWebsocketConnectionSettings;
  onObsWebsocketConnectionChange: (
    settings: ObsWebsocketConnectionSettings,
  ) => void;
  onSaveObsWebsocketConnection: () => void;
  saved: boolean;
};

export function ObsWebsocketSettings({
  obsWebsocketConnection,
  onObsWebsocketConnectionChange,
  onSaveObsWebsocketConnection,
  saved,
}: ObsWebsocketSettingsProps) {
  const updateConnection = (
    value: string,
    field: keyof ObsWebsocketConnectionSettings,
  ): void => {
    onObsWebsocketConnectionChange({
      ...obsWebsocketConnection,
      [field]: value,
    });
  };

  return (
    <Board icon={Cable} title="OBS WebSocket接続">
      <section className="grid grid-cols-[auto_minmax(130px,1fr)_auto_80px_auto_minmax(150px,1fr)_auto] items-center gap-[7px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2 max-[700px]:grid-cols-[auto_minmax(0,1fr)] max-[700px]:items-start">
        <label className="font-extrabold" htmlFor="obs-websocket-server-ip">
          サーバーIP
        </label>
        <TextInput
          aria-label="OBS WebSocketサーバーIP"
          id="obs-websocket-server-ip"
          onChange={(event) =>
            updateConnection(event.currentTarget.value, "serverIp")
          }
          placeholder="192.168.1.19"
          type="text"
          value={obsWebsocketConnection.serverIp}
        />
        <label className="font-extrabold" htmlFor="obs-websocket-server-port">
          ポート
        </label>
        <TextInput
          aria-label="OBS WebSocketサーバーポート"
          id="obs-websocket-server-port"
          inputMode="numeric"
          onChange={(event) =>
            updateConnection(event.currentTarget.value, "serverPort")
          }
          placeholder="4455"
          type="text"
          value={obsWebsocketConnection.serverPort}
        />
        <label
          className="font-extrabold"
          htmlFor="obs-websocket-server-password"
        >
          パスワード
        </label>
        <TextInput
          aria-label="OBS WebSocketサーバーパスワード"
          id="obs-websocket-server-password"
          onChange={(event) =>
            updateConnection(event.currentTarget.value, "serverPassword")
          }
          placeholder="サーバーパスワード"
          type="password"
          value={obsWebsocketConnection.serverPassword}
        />
        <div className="flex items-center gap-[7px] max-[700px]:col-span-2">
          <Button
            aria-label="OBS WebSocket接続情報を保存"
            onClick={onSaveObsWebsocketConnection}
            type="button"
          >
            <Save aria-hidden="true" size={18} />
            保存
          </Button>
          {saved ? (
            <span className="text-xs text-[#0b5f24]">保存済み</span>
          ) : null}
        </div>
      </section>
    </Board>
  );
}
