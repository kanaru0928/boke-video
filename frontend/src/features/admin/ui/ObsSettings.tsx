import { RadioTower } from "lucide-react";
import { Board } from "../../../shared/ui/Board";

export function ObsSettings() {
  return (
    <Board icon={RadioTower} title="OBS設定">
      <section className="grid gap-[7px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2">
        <ObsStep number="1" text="OBSの設定を開き、配信を選択します。" />
        <ObsStep number="2" text="サービスでWHIPを選択します。" />
        <ObsStep
          number="3"
          text="配信枠のコピーボタンからサーバーURLとBearer Tokenを入力します。"
        />
        <ObsStep number="4" text="適用して配信開始を押します。" />
        <p className="m-0 border border-[#d6d6d6] bg-white px-2 py-[6px] text-sm leading-snug text-[#333333]">
          注: 出力 &gt; 配信 &gt;
          エンコーダ設定で「Bフレームを使用する」をオフにしてください。
        </p>
        <p className="m-0 border border-[#d6d6d6] bg-white px-2 py-[6px] text-sm leading-snug text-[#333333]">
          サイマルキャスト対応です。OBSの設定 &gt; 配信 &gt; サイマルキャスト
          &gt;
          合計レイヤー数で1から4を選べます。このサービスでは3レイヤー推奨です。
        </p>
      </section>
    </Board>
  );
}

type ObsStepProps = {
  number: string;
  text: string;
};

function ObsStep({ number, text }: ObsStepProps) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-[7px]">
      <span className="grid h-[24px] w-[24px] select-none place-items-center border border-[#777777] bg-[linear-gradient(#ffffff,#d5d5d5_48%,#a9a9a9_49%,#efefef)] text-sm font-extrabold shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#8a8a8a]">
        {number}
      </span>
      <p className="m-0 pt-[2px] leading-snug">{text}</p>
    </div>
  );
}
