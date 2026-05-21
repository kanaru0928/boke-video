import { RadioTower } from "lucide-react";
import { Board } from "../../shared/ui/Board";

type ObsSettingsProps = {
  serverUrl: string | null;
  bearerToken: string | null;
};

export function ObsSettings({ serverUrl, bearerToken }: ObsSettingsProps) {
  return (
    <Board icon={RadioTower} title="OBS設定">
      <section className="grid gap-[6px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2">
        <ObsSettingRow label="サービス" value="WHIP" />
        <ObsSettingRow
          label="サーバー"
          value={serverUrl ?? "枠を作成すると表示します"}
        />
        <ObsSettingRow
          label="Bearer Token"
          value={bearerToken ?? "作成時または再発行時に表示します"}
        />
      </section>
    </Board>
  );
}

type ObsSettingRowProps = {
  label: string;
  value: string;
};

function ObsSettingRow({ label, value }: ObsSettingRowProps) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2 max-[520px]:grid-cols-1 max-[520px]:gap-1">
      <span className="font-extrabold">{label}</span>
      <code className="min-h-8 border border-[#a7a7a7] bg-white px-2 py-[6px] font-[Arial,sans-serif] text-sm [overflow-wrap:anywhere]">
        {value}
      </code>
    </div>
  );
}
