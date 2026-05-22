import { Check, Clipboard, RadioTower } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { TextInput } from "../../../shared/ui/FormControl";
import { defaultObsWebsocketUrl } from "../lib/obs_stream_service";

export type IngestCopyTarget = "serverUrl" | "bearerToken";
export type ObsApplyStatus = "idle" | "applying" | "applied" | "failed";

type IngestSettingsProps = {
  copiedTarget: IngestCopyTarget | null;
  obsApplyError: string | null;
  obsApplyStatus: ObsApplyStatus;
  obsWebsocketPassword: string;
  obsWebsocketUrl: string;
  onApplyObs: () => Promise<void>;
  onCopy: (target: IngestCopyTarget, value: string) => Promise<void>;
  onObsWebsocketPasswordChange: (value: string) => void;
  onObsWebsocketUrlChange: (value: string) => void;
  serverUrl: string;
  whipBearerToken: string | null;
};

export function IngestSettings({
  copiedTarget,
  obsApplyError,
  obsApplyStatus,
  obsWebsocketPassword,
  obsWebsocketUrl,
  onApplyObs,
  onCopy,
  onObsWebsocketPasswordChange,
  onObsWebsocketUrlChange,
  serverUrl,
  whipBearerToken,
}: IngestSettingsProps) {
  return (
    <section
      aria-label="配信枠のOBS入力"
      className="grid select-none gap-[6px] border border-[#c9c9c9] bg-[#f7f7f7] p-[6px]"
    >
      <div className="flex flex-wrap gap-[5px]">
        <Button
          className="mr-2 w-[126px] select-none text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={whipBearerToken === null || obsApplyStatus === "applying"}
          onClick={() => void onApplyObs()}
        >
          <RadioTower aria-hidden="true" size={17} />
          {obsApplyStatus === "applying" ? "反映中" : "OBSへ反映する"}
        </Button>
        <IngestCopyButton
          copied={copiedTarget === "serverUrl"}
          label="サーバーURLをコピー"
          onCopy={() => onCopy("serverUrl", serverUrl)}
        />
        <IngestCopyButton
          copied={copiedTarget === "bearerToken"}
          disabled={whipBearerToken === null}
          label="Bearer Tokenをコピー"
          onCopy={() =>
            whipBearerToken === null
              ? Promise.resolve()
              : onCopy("bearerToken", whipBearerToken)
          }
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,180px)] gap-[5px] max-[760px]:grid-cols-1">
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
          placeholder="パスワード"
          type="password"
          value={obsWebsocketPassword}
        />
      </div>
      {whipBearerToken === null ? (
        <p className="m-0 text-xs text-[#555555]">
          Tokenは作成時または再発行時にコピーできます。
        </p>
      ) : null}
      {obsApplyStatus === "applied" ? (
        <p className="m-0 text-xs text-[#0b5f24]">OBSへ反映しました。</p>
      ) : null}
      {obsApplyStatus === "failed" && obsApplyError !== null ? (
        <p className="m-0 text-xs text-[#b00020]">{obsApplyError}</p>
      ) : null}
    </section>
  );
}

type IngestCopyButtonProps = {
  copied: boolean;
  disabled?: boolean;
  label: string;
  onCopy: () => Promise<void>;
};

function IngestCopyButton({
  copied,
  disabled = false,
  label,
  onCopy,
}: IngestCopyButtonProps) {
  return (
    <Button
      className="select-none text-sm disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={() => void onCopy()}
    >
      {copied ? (
        <Check aria-hidden="true" size={17} />
      ) : (
        <Clipboard aria-hidden="true" size={17} />
      )}
      {copied ? "コピー済み" : label}
    </Button>
  );
}
