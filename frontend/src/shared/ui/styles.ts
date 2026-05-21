import { cn } from "./classNames";

export const appShellClassName = cn(
  "mx-auto min-h-screen w-[min(980px,100%)] px-[10px] pt-3 pb-[18px]",
  "font-['MS_PGothic','Hiragino_Kaku_Gothic_ProN',Meiryo,sans-serif] text-[#111111]",
  "max-[860px]:pt-[10px] max-[520px]:px-1.5 max-[520px]:pt-2",
);

export const topbarClassName = cn(
  "mb-[9px] grid grid-cols-[240px_1fr] items-end gap-[10px] border-b border-[#222222]",
  "max-[860px]:grid-cols-1 max-[520px]:mb-[7px]",
);

export const siteMarkClassName =
  "grid gap-0 pb-[5px] text-inherit no-underline";

export const siteMarkMainClassName = cn(
  "text-[32px] leading-[0.86] font-black tracking-normal",
  "[text-shadow:2px_2px_0_#ffffff,3px_3px_0_#8a8a8a]",
  "max-[520px]:text-2xl",
);

export const siteMarkSubClassName =
  "font-[Arial,sans-serif] text-[11px] font-extrabold tracking-[1px] max-[520px]:text-[10px]";

export const topnavClassName = cn(
  "flex flex-wrap justify-end gap-0 border border-b-0 border-[#3f3f3f]",
  "bg-[linear-gradient(#8b8b8b,#111111_48%,#545454)] max-[860px]:justify-start",
);

export const topnavLinkClassName = cn(
  "border-l border-[#777777] px-3 py-[7px] text-[13px] text-white underline first:border-l-0",
  "whitespace-nowrap [text-shadow:1px_1px_0_#000000] max-[520px]:px-3 max-[520px]:py-1.5",
);

export const boardChromeClassName = cn(
  "mb-[10px] border border-[#8c8c8c] bg-[#eeeeee] p-[5px]",
  "shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8]",
);

export const boardTitleClassName = cn(
  "flex items-center gap-2 border border-[#494949] px-[9px] py-1.5 text-white",
  "bg-[linear-gradient(#8c8c8c,#202020)] [text-shadow:1px_1px_0_#000000]",
);

export const boardTitleTextClassName =
  "m-0 text-[19px] font-extrabold tracking-normal max-[520px]:text-base";

export const formControlClassName = cn(
  "w-full rounded-none border border-[#8d8d8d] bg-white px-[7px] py-[5px] text-[#111111]",
  "shadow-[inset_1px_1px_2px_#c4c4c4]",
);

export const textareaClassName = cn(
  formControlClassName,
  "min-h-[42px] max-h-[130px] resize-y max-[520px]:min-h-[38px]",
);

const buttonBaseClassName = cn(
  "inline-flex min-h-7 cursor-pointer items-center justify-center gap-[5px] whitespace-nowrap",
  "rounded-[3px] border border-[#777777] px-[10px] py-1 text-[#111111] no-underline",
  "bg-[linear-gradient(#ffffff,#d5d5d5_48%,#a9a9a9_49%,#efefef)]",
  "shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#8a8a8a]",
  "active:bg-[linear-gradient(#bcbcbc,#eeeeee)] active:shadow-[inset_1px_1px_0_#777777,inset_-1px_-1px_0_#ffffff]",
  "disabled:cursor-not-allowed disabled:border-[#9b9b9b] disabled:bg-[linear-gradient(#eeeeee,#d7d7d7)] disabled:text-[#777777] disabled:opacity-65 disabled:shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8]",
  "[&_svg]:shrink-0 [&_svg]:[stroke-width:2.4]",
);

export function buttonClassName(options?: {
  primary?: boolean;
  square?: boolean;
  className?: string;
}): string {
  return cn(
    buttonBaseClassName,
    options?.primary &&
      "border-[#0052b4] bg-[linear-gradient(#3aa4ff,#0070ee_48%,#005ac8_49%,#1682ff)] font-extrabold text-white [text-shadow:1px_1px_0_#003064]",
    options?.square && "h-7 w-[34px] min-h-7 p-0 max-[520px]:w-[31px]",
    options?.className,
  );
}
