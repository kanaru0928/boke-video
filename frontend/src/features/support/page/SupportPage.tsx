import { HelpCircle } from "lucide-react";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { AppShell } from "../../../shared/ui/AppShell";
import { Board } from "../../../shared/ui/Board";

const supportItems = [
  {
    messages: [
      "TailscaleのExit Nodeを使っている場合、WebRTCのUDP通信が不安定になり、映像や音声が再生されないことがあります。",
      "再生できないときは、TailscaleのExit Nodeを切ってから視聴してください。",
    ],
    title: "映像が再生されない場合",
  },
] as const;

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
          {supportItems.map((item) => (
            <article
              className="grid gap-2 border border-[#a7a7a7] bg-white p-[14px]"
              key={item.title}
            >
              <h2 className="m-0 text-lg font-extrabold text-[#202020]">
                {item.title}
              </h2>
              {item.messages.map((message) => (
                <p
                  className="m-0 text-sm leading-[1.8] text-[#333333]"
                  key={message}
                >
                  {message}
                </p>
              ))}
            </article>
          ))}
        </section>
      </Board>
    </AppShell>
  );
}
