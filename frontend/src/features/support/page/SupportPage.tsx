import { HelpCircle } from "lucide-react";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { AppShell } from "../../../shared/ui/AppShell";
import { Board } from "../../../shared/ui/Board";

export function SupportPage() {
  return (
    <AppShell>
      <AppHeader
        section="SUPPORT"
        links={[
          { href: "/", label: "枠一覧" },
          { href: "/admin", label: "管理" },
          { href: "/user", label: "ユーザー" },
        ]}
      />
      <Board icon={HelpCircle} title="サポート">
        <section className="grid gap-2 border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2">
          <article className="grid gap-2 border border-[#a7a7a7] bg-white p-[14px]">
            <h2 className="m-0 text-lg font-extrabold text-[#202020]">
              映像が再生されない場合
            </h2>
            <p className="m-0 text-sm leading-[1.8] text-[#333333]">
              TailscaleのExit Nodeを使っている場合、WebRTCのUDP通信が不安定になり、映像や音声が再生されないことがあります。
            </p>
            <p className="m-0 text-sm leading-[1.8] text-[#333333]">
              再生できないときは、TailscaleのExit Nodeを切ってから視聴してください。
            </p>
          </article>
        </section>
      </Board>
    </AppShell>
  );
}
