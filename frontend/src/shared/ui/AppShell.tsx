import type { ReactNode } from "react";
import { cn } from "./classNames";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <section
      className={cn(
        "mx-auto min-h-screen w-[min(1260px,100%)] px-[10px] pt-3 pb-[18px]",
        "font-['MS_PGothic','Hiragino_Kaku_Gothic_ProN',Meiryo,sans-serif] text-[#111111]",
        "max-[860px]:pt-[10px] max-[520px]:px-1.5 max-[520px]:pt-2",
      )}
    >
      {children}
    </section>
  );
}
