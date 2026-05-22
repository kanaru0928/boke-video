import { Check, Clipboard, RadioTower } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { AdminStatusLine } from "./AdminStatusLine";

export type IngestCopyTarget = "serverUrl" | "bearerToken";
export type ObsApplyStatus = "idle" | "applying" | "applied" | "failed";

type IngestSettingsProps = {
  copiedTarget: IngestCopyTarget | null;
  obsApplyError: string | null;
  obsApplyStatus: ObsApplyStatus;
  onApplyObs: () => Promise<void>;
  onCopy: (target: IngestCopyTarget, value: string) => Promise<void>;
  serverUrl: string;
  whipBearerToken: string | null;
};

export function IngestSettings({
  copiedTarget,
  obsApplyError,
  obsApplyStatus,
  onApplyObs,
  onCopy,
  serverUrl,
  whipBearerToken,
}: IngestSettingsProps) {
  const status = ingestStatusMessage({
    copiedTarget,
    obsApplyError,
    obsApplyStatus,
    whipBearerToken,
  });

  return (
    <section
      aria-label="配信枠のOBS入力"
      className="relative grid select-none gap-[6px] border border-[#c9c9c9] bg-[#f7f7f7] p-[6px]"
    >
      <div className="flex flex-wrap gap-[5px]">
        <Button
          className="mr-2 w-[126px] select-none text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={obsApplyStatus === "applying"}
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
      <AdminStatusLine
        className="absolute left-2 bottom-[calc(100%+4px)] z-10 max-w-[min(520px,calc(100vw-48px))]"
        message={status.message}
        tone={status.tone}
      />
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
      className="w-[176px] select-none text-sm disabled:cursor-not-allowed disabled:opacity-60"
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

function ingestStatusMessage({
  copiedTarget,
  obsApplyError,
  obsApplyStatus,
  whipBearerToken,
}: Pick<
  IngestSettingsProps,
  "copiedTarget" | "obsApplyError" | "obsApplyStatus" | "whipBearerToken"
>): { message: string; tone: "neutral" | "success" | "error" } {
  if (obsApplyStatus === "failed" && obsApplyError !== null) {
    return { message: obsApplyError, tone: "error" };
  }
  if (obsApplyStatus === "applied") {
    return { message: "OBSへ反映しました。", tone: "success" };
  }
  if (copiedTarget === "serverUrl") {
    return { message: "サーバーURLをコピーしました。", tone: "success" };
  }
  if (copiedTarget === "bearerToken") {
    return { message: "Bearer Tokenをコピーしました。", tone: "success" };
  }
  if (whipBearerToken === null) {
    return { message: "", tone: "neutral" };
  }
  return { message: "", tone: "neutral" };
}
