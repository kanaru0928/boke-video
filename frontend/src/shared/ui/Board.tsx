import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./classNames";

type BoardProps = {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
  title: string;
};

export function Board({ children, className, icon: Icon, title }: BoardProps) {
  return (
    <section
      className={cn(
        "mb-[10px] border border-[#8c8c8c] bg-[#eeeeee] p-[5px]",
        "shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border border-[#494949] px-[9px] py-1.5 text-white",
          "bg-[linear-gradient(#8c8c8c,#202020)] [text-shadow:1px_1px_0_#000000]",
        )}
      >
        <Icon aria-hidden="true" size={18} />
        <h1 className="m-0 text-[19px] font-extrabold tracking-normal max-[520px]:text-base">
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}
