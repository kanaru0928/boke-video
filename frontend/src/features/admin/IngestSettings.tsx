import { Check, Clipboard } from "lucide-react";
import { Button } from "../../shared/ui/Button";

export type IngestCopyTarget = "serverUrl" | "bearerToken";

type IngestSettingsProps = {
  copiedTarget: IngestCopyTarget | null;
  onCopy: (target: IngestCopyTarget, value: string) => Promise<void>;
  serverUrl: string;
  whipBearerToken: string | null;
};

export function IngestSettings({
  copiedTarget,
  onCopy,
  serverUrl,
  whipBearerToken,
}: IngestSettingsProps) {
  return (
    <section
      aria-label="配信枠のOBS入力"
      className="grid select-none gap-[6px] border border-[#c9c9c9] bg-[#f7f7f7] p-[6px]"
    >
      <div className="flex flex-wrap gap-[5px]">
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
      {whipBearerToken === null ? (
        <p className="m-0 text-xs text-[#555555]">
          Tokenは作成時または再発行時にコピーできます。
        </p>
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
