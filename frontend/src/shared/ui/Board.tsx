import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./classNames";
import {
  boardChromeClassName,
  boardTitleClassName,
  boardTitleTextClassName,
} from "./styles";

type BoardProps = {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
  title: string;
};

export function Board({ children, className, icon: Icon, title }: BoardProps) {
  return (
    <section className={cn(boardChromeClassName, className)}>
      <div className={boardTitleClassName}>
        <Icon aria-hidden="true" size={18} />
        <h1 className={boardTitleTextClassName}>{title}</h1>
      </div>
      {children}
    </section>
  );
}
