import { RadioTower } from "lucide-react";
import type { ReactNode } from "react";
import { Board } from "../../../shared/ui/Board";

export function ObsSettings() {
  return (
    <Board icon={RadioTower} title="OBS設定">
      <section className="grid gap-[7px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2">
        <div className="grid gap-[7px] border border-[#d6d6d6] bg-white p-2">
          <p className="m-0 font-extrabold leading-snug">
            推奨: WebSocketで反映
          </p>
          <ObsStep
            number="1"
            text={
              <>
                OBSの<ObsTerm>ツール</ObsTerm> &gt;{" "}
                <ObsTerm>WebSocketサーバー設定</ObsTerm>を開きます。
              </>
            }
          />
          <ObsStep
            number="2"
            text={
              <>
                <ObsTerm>WebSocketサーバーを有効にする</ObsTerm>
                をオンにします。
              </>
            }
          />
          <ObsStep
            number="3"
            text={
              <>
                <ObsTerm>認証を有効にする</ObsTerm>をオンにし、
                <ObsTerm>接続情報を表示</ObsTerm>から
                <ObsTerm>サーバーパスワード</ObsTerm>を確認します。
              </>
            }
          />
          <ObsStep
            number="4"
            text={
              <>
                この画面の<ObsTerm>OBS WebSocket接続</ObsTerm>に
                <ObsTerm>サーバーIP</ObsTerm>、<ObsTerm>ポート</ObsTerm>、
                <ObsTerm>パスワード</ObsTerm>を入力します。
              </>
            }
          />
          <ObsStep
            number="5"
            text={
              <>
                配信枠の<ObsTerm>OBSへ反映する</ObsTerm>を押し、
                OBSで配信開始を押します。
              </>
            }
          />
        </div>
        <div className="grid gap-[7px] border border-[#d6d6d6] bg-white p-2">
          <p className="m-0 font-extrabold leading-snug">手動で入力</p>
          <ObsStep
            number="1"
            text={
              <>
                OBSの設定を開き、<ObsTerm>配信</ObsTerm>
                を選択します。
              </>
            }
          />
          <ObsStep
            number="2"
            text={
              <>
                サービスで<ObsTerm>WHIP</ObsTerm>を選択します。
              </>
            }
          />
          <ObsStep
            number="3"
            text={
              <>
                配信枠のコピーボタンから<ObsTerm>サーバーURL</ObsTerm>と
                <ObsTerm>Bearer Token</ObsTerm>を入力します。
              </>
            }
          />
          <ObsStep
            number="4"
            text={
              <>
                <ObsTerm>適用</ObsTerm>して配信開始を押します。
              </>
            }
          />
        </div>
        <p className="m-0 border border-[#d6d6d6] bg-white px-2 py-[6px] text-sm leading-snug text-[#333333]">
          注: <ObsTerm>出力</ObsTerm> &gt; <ObsTerm>配信</ObsTerm> &gt;
          <ObsTerm>エンコーダ設定</ObsTerm>で
          <ObsTerm>Bフレームを使用する</ObsTerm>をオフにしてください。
        </p>
        <p className="m-0 border border-[#d6d6d6] bg-white px-2 py-[6px] text-sm leading-snug text-[#333333]">
          サイマルキャスト対応です。 OBSの設定 &gt; <ObsTerm>配信</ObsTerm> &gt;
          <ObsTerm>サイマルキャスト</ObsTerm> &gt;
          <ObsTerm>合計レイヤー数</ObsTerm>
          で1から4を選べます。このサービスでは3レイヤー推奨です。
        </p>
      </section>
    </Board>
  );
}

type ObsStepProps = {
  number: string;
  text: ReactNode;
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

function ObsTerm({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block border border-[#a7a7a7] bg-[#f2f2f2] px-[4px] py-px text-[0.92em] font-extrabold leading-[1.25] text-[#111111] shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#c7c7c7]">
      {children}
    </span>
  );
}
