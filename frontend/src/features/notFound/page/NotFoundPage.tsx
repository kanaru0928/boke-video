import { SearchX } from "lucide-react";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { AppShell } from "../../../shared/ui/AppShell";
import { Board } from "../../../shared/ui/Board";
import { ButtonLink } from "../../../shared/ui/Button";
import { Mascot } from "../../../shared/ui/Mascot";

export function NotFoundPage() {
  return (
    <AppShell>
      <AppHeader section="404" links={[{ href: "/", label: "枠一覧" }]} />
      <Board
        className="grid min-h-[calc(100vh-96px)] grid-rows-[auto_minmax(0,1fr)]"
        icon={SearchX}
        title="404"
      >
        <div className="grid min-h-[260px] content-center justify-items-center gap-4 border border-t-0 border-[#a7a7a7] bg-white p-4 text-center max-[520px]:p-3">
          <div className="grid justify-items-center gap-2">
            <p className="m-0 text-base font-extrabold">
              ページが見つかりません
            </p>
            <ButtonLink className="w-fit" href="/">
              枠一覧へ戻る
            </ButtonLink>
          </div>
          <Mascot
            className="justify-self-center"
            mood="notFound"
            title="目がバツ印のマスコット"
          />
        </div>
      </Board>
    </AppShell>
  );
}
