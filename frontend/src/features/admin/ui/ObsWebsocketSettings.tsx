import { Cable } from "lucide-react";
import { Board } from "../../../shared/ui/Board";
import { TextInput } from "../../../shared/ui/FormControl";
import { defaultObsWebsocketUrl } from "../lib/obs_stream_service";

type ObsWebsocketSettingsProps = {
  obsWebsocketPassword: string;
  obsWebsocketUrl: string;
  onObsWebsocketPasswordChange: (value: string) => void;
  onObsWebsocketUrlChange: (value: string) => void;
};

export function ObsWebsocketSettings({
  obsWebsocketPassword,
  obsWebsocketUrl,
  onObsWebsocketPasswordChange,
  onObsWebsocketUrlChange,
}: ObsWebsocketSettingsProps) {
  return (
    <Board icon={Cable} title="OBS WebSocket接続">
      <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,220px)] gap-[6px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2 max-[760px]:grid-cols-1">
        <TextInput
          aria-label="OBS WebSocket URL"
          onChange={(event) =>
            onObsWebsocketUrlChange(event.currentTarget.value)
          }
          placeholder={defaultObsWebsocketUrl}
          type="text"
          value={obsWebsocketUrl}
        />
        <TextInput
          aria-label="OBS WebSocketパスワード"
          onChange={(event) =>
            onObsWebsocketPasswordChange(event.currentTarget.value)
          }
          placeholder="OBS側のパスワード"
          type="password"
          value={obsWebsocketPassword}
        />
      </section>
    </Board>
  );
}
