import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "./classNames";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  square?: boolean;
};

export function Button({
  children,
  className,
  primary = false,
  square = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ className, primary, square })}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  primary?: boolean;
};

export function ButtonLink({
  children,
  className,
  primary = false,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonClassName({ className, primary })} {...props}>
      {children}
    </a>
  );
}

function buttonClassName(options?: {
  primary?: boolean;
  square?: boolean;
  className?: string;
}): string {
  return cn(
    "inline-flex min-h-7 cursor-pointer items-center justify-center gap-[5px] whitespace-nowrap",
    "rounded-[3px] border border-[#777777] px-[10px] py-1 text-[#111111] no-underline",
    "bg-[linear-gradient(#ffffff,#d5d5d5_48%,#a9a9a9_49%,#efefef)]",
    "shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#8a8a8a]",
    "active:bg-[linear-gradient(#bcbcbc,#eeeeee)] active:shadow-[inset_1px_1px_0_#777777,inset_-1px_-1px_0_#ffffff]",
    "disabled:cursor-not-allowed disabled:border-[#9b9b9b] disabled:bg-[linear-gradient(#eeeeee,#d7d7d7)] disabled:text-[#777777] disabled:opacity-65 disabled:shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8]",
    "[&_svg]:shrink-0 [&_svg]:[stroke-width:2.4]",
    options?.primary &&
      "border-[#0052b4] bg-[linear-gradient(#3aa4ff,#0070ee_48%,#005ac8_49%,#1682ff)] font-extrabold text-white [text-shadow:1px_1px_0_#003064]",
    options?.square && "h-7 w-[34px] min-h-7 p-0 max-[520px]:w-[31px]",
    options?.className,
  );
}
