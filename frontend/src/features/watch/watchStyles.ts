import { cn } from "../../shared/ui/classNames";

export const programBoardClassName = cn(
  "mb-[10px] grid grid-cols-[minmax(0,1fr)_minmax(220px,330px)] items-center gap-3",
  "border border-[#c29300] bg-[#fffdf2] px-2 py-[5px]",
  "max-[860px]:grid-cols-1 max-[520px]:mb-[7px] max-[520px]:gap-1.5 max-[520px]:px-[7px] max-[520px]:py-1",
);

export const programKickerClassName =
  "mb-[3px] inline-block bg-[#d40000] px-[5px] py-px text-[11px] font-extrabold text-white";

export const programTitleClassName =
  "m-0 text-[19px] font-extrabold tracking-normal max-[520px]:text-base";

export const watchGridClassName =
  "grid grid-cols-[minmax(0,1fr)_360px] gap-2 max-[1040px]:grid-cols-1";

export const playerColumnClassName = cn(
  "relative min-w-0 border border-[#8c8c8c] bg-[#eeeeee] p-[5px]",
  "shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8]",
);

export const stageClassName = cn(
  "group relative aspect-video w-full overflow-hidden border border-black bg-[#020202] leading-none",
  "bg-[repeating-linear-gradient(0deg,rgb(255_255_255_/_3%)_0,rgb(255_255_255_/_3%)_1px,transparent_1px,transparent_3px)]",
  "[&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:aspect-auto [&:fullscreen_video]:object-contain",
);

export const videoElementClassName =
  "block aspect-video h-full w-full bg-[#020202] object-cover";

export const commentsLayerClassName =
  "pointer-events-none absolute inset-0 z-10 overflow-hidden";

export const streamStatusClassName = cn(
  "pointer-events-none absolute inset-0 z-0 grid place-items-center p-5 text-center text-[28px] font-extrabold text-white",
  "[text-shadow:2px_2px_0_#000000,-1px_-1px_0_#000000] max-[520px]:text-[23px]",
);

export const streamLoadingClassName = cn(
  "pointer-events-none absolute inset-0 z-20 grid place-items-center p-5 text-center text-white",
  "[text-shadow:2px_2px_0_#000000,-1px_-1px_0_#000000]",
);

export const streamLoadingPanelClassName = cn(
  "grid place-items-center gap-2 rounded-sm border border-[#6d6d6d] bg-[rgb(0_0_0_/_72%)] px-5 py-4",
  "shadow-[2px_2px_0_rgb(0_0_0_/_65%),inset_1px_1px_0_rgb(255_255_255_/_18%)]",
);

export const streamLoadingIconClassName =
  "size-9 animate-spin text-[#4ab8ff] max-[520px]:size-8";

export const streamLoadingTextClassName = "text-sm font-extrabold leading-none";

export const manualPlaybackOverlayClassName = cn(
  "pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-[#020202]",
  "border-0 p-0 text-white",
);

export const manualPlaybackIconClassName = cn(
  "size-20 rounded-full border-2 border-white bg-[rgb(0_0_0_/_42%)] p-4 text-white",
  "shadow-[0_0_0_1px_rgb(0_0_0_/_65%),0_2px_14px_rgb(0_0_0_/_75%)] max-[520px]:size-16 max-[520px]:p-3",
);

export const playerControlsClassName = cn(
  "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex min-h-[45px] items-center justify-between gap-2 opacity-0",
  "border-t border-t-[rgb(255_255_255_/_28%)] bg-[linear-gradient(rgb(0_0_0_/_10%),rgb(0_0_0_/_72%))] px-[10px] py-[6px] text-white",
  "transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  "[@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:opacity-100",
  "max-[520px]:min-h-[39px] max-[520px]:gap-[3px] max-[520px]:px-[5px] max-[520px]:py-[5px]",
);

export const playerControlsVisibleClassName = "pointer-events-auto opacity-100";

export const playTimeClassName = cn(
  "min-w-[104px] rounded-xl border border-[#898989] px-[10px] py-1 text-center font-extrabold text-white",
  "bg-[linear-gradient(#464646,#111111_52%,#565656)] shadow-[inset_1px_1px_0_#8c8c8c] max-[520px]:hidden",
);

export const liveBadgeClassName =
  "font-[Arial,sans-serif] text-[13px] font-extrabold tracking-normal text-[#ff134f] [text-shadow:1px_1px_0_#000000]";

export const settingsChipClassName = cn(
  "absolute right-0 bottom-[46px] z-30 w-[312px] max-w-[calc(100vw-24px)] border border-[#666666] bg-[#050505] p-[7px] text-xs text-white",
  "shadow-[2px_2px_0_rgb(0_0_0_/_65%),inset_1px_1px_0_rgb(255_255_255_/_18%)] max-[520px]:right-0 max-[520px]:w-[292px] max-[380px]:w-[262px]",
);

export const settingsChipHeadingClassName =
  "m-0 border-b border-[#666666] pb-[6px] text-sm font-extrabold [text-shadow:1px_1px_0_#000000]";

export const settingsChipRowClassName = cn(
  "m-0 grid grid-cols-[70px_minmax(0,1fr)] items-start gap-[7px] border-0 border-b border-[#333333] px-0 py-[7px] last:border-b-0",
  "[&_legend]:contents [&_legend]:pt-[4px] [&_legend]:font-extrabold [&_legend]:text-white max-[520px]:grid-cols-1 max-[520px]:gap-[5px]",
);

export const settingsChipSegmentClassName = cn(
  "flex min-w-0 flex-wrap justify-end gap-[4px] [&_label]:min-w-0",
  "max-[520px]:grid max-[520px]:grid-cols-2 max-[520px]:justify-stretch max-[520px]:[&_label]:w-full",
);

export const settingsChipSegmentInputClassName =
  "peer pointer-events-none absolute m-0 h-px w-px opacity-0";

export const settingsChipSegmentTextClassName = cn(
  "grid min-h-[26px] max-w-full cursor-pointer select-none grid-flow-col place-items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[13px] border border-[#3f3f3f]",
  "bg-[linear-gradient(#4d4d4d,#1b1b1b)] px-[9px] py-[4px] text-[11px] leading-none text-[#eeeeee]",
  "peer-checked:border-[#7fbdff] peer-checked:bg-[linear-gradient(#4dc7ff,#006fd8)] peer-checked:font-extrabold peer-checked:text-white",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[#ffffff]",
);

export const settingsChipEmptyClassName =
  "min-h-[22px] select-none rounded-[10px] border border-[#333333] bg-[#111111] px-[8px] py-[5px] text-center text-[11px] leading-none text-[#bbbbbb]";

export const commentFormClassName = "grid gap-[5px] pt-1.5";

export const commentComposeClassName =
  "grid min-w-0 grid-cols-[minmax(0,1fr)_118px] gap-[5px] max-[520px]:grid-cols-1";

export const commentSubmitButtonClassName =
  "min-h-[42px] min-w-0 max-w-full px-2 text-[15px] max-[520px]:min-h-[38px] max-[520px]:gap-[4px] max-[520px]:px-2 max-[520px]:text-sm";

export const commentOptionsClassName = cn(
  "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(150px,0.8fr)_minmax(150px,auto)] items-start gap-2",
  "max-[640px]:grid-cols-1 max-[640px]:gap-[5px]",
);

export const choiceFieldClassName =
  "m-0 min-w-0 border border-[#b0b0b0] bg-[#f8f8f8] p-[5px] max-[520px]:p-1 [&_legend]:px-1 [&_legend]:text-xs [&_legend]:font-extrabold";

export const directionChoiceGridClassName =
  "grid grid-cols-3 gap-1 max-[520px]:grid-cols-2";

export const sizeChoiceGridClassName = "grid grid-cols-3 gap-1";

export const colorRowClassName =
  "flex min-w-0 flex-wrap gap-[5px] border border-[#b0b0b0] bg-[#f8f8f8] p-1.5 max-[640px]:p-1";

export const colorButtonClassName =
  "h-[25px] min-h-[25px] w-[25px] border-[#777777] bg-none p-0 shadow-[inset_1px_1px_0_rgb(255_255_255_/_70%),inset_-1px_-1px_0_rgb(0_0_0_/_35%)] max-[520px]:h-[22px] max-[520px]:min-h-[22px] max-[520px]:w-[22px]";

export const selectedColorButtonClassName =
  "outline-2 outline-offset-2 outline-[#006bd6]";

export const sidePanelClassName =
  "grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] border border-[#8c8c8c] bg-white shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8] max-[1040px]:h-[min(420px,calc(100vh-24px))] max-[1040px]:min-h-[280px] max-[520px]:h-[min(360px,calc(100vh-18px))] max-[520px]:min-h-[230px]";

export const counterStripClassName =
  "grid grid-cols-3 border-b border-[#d2d2d2] bg-white [&_span]:border-l [&_span]:border-[#e2e2e2] [&_span]:px-1 [&_span]:py-[7px] [&_span]:text-center [&_span]:text-xs [&_span]:leading-[1.35] [&_span]:text-[#777777] [&_span:first-child]:border-l-0 max-[520px]:[&_span]:py-[5px]";

export const tabRowClassName =
  "grid grid-cols-1 bg-[#f7f7f7] [&_button]:min-h-[34px] [&_button]:rounded-none [&_button]:border-0 [&_button]:border-r [&_button]:border-b [&_button]:border-[#d2d2d2] [&_button]:bg-[#f7f7f7] [&_button]:font-extrabold [&_button]:shadow-none [&_button:last-child]:border-r-0 max-[520px]:[&_button]:min-h-[29px]";

export const activeTabButtonClassName =
  "min-h-[34px] rounded-none border-0 border-b-2 border-b-[#111111] bg-white font-extrabold shadow-none max-[520px]:min-h-[29px]";

export const commentLogClassName =
  "relative h-[calc(100dvh-250px)] min-h-[260px] overflow-auto bg-white max-[860px]:h-full max-[860px]:min-h-0";

export const commentLogVirtualListClassName = "relative m-0 list-none p-0";

export const commentLogItemClassName =
  "absolute left-0 top-0 grid min-h-[52px] w-full grid-cols-[38px_minmax(0,1fr)] border-b border-[#eeeeee] max-[520px]:min-h-[44px]";

export const commentLogNumberClassName =
  "pt-[9px] text-center text-xs text-[#8d8d8d] max-[520px]:pt-[7px]";

export const commentLogContentClassName =
  "grid min-w-0 gap-[2px] px-2 py-[7px] max-[520px]:py-[6px]";

export const commentLogMetaClassName =
  "m-0 flex min-w-0 items-center gap-[7px] text-[11px] font-extrabold text-[#777777] [&_span]:min-w-0 [&_span]:truncate [&_time]:shrink-0 [&_time]:font-normal";

export const commentLogBodyClassName =
  "m-0 text-[13px] [overflow-wrap:anywhere]";

export const secondCommentLogBodyClassName = "font-extrabold text-[#ff4b73]";

export const choiceChipLabelClassName = "relative block min-w-0";

export const choiceChipInputClassName =
  "peer pointer-events-none absolute m-0 h-px w-px opacity-0";

export const choiceChipTextClassName = cn(
  "grid min-h-[26px] min-w-0 cursor-pointer select-none place-items-center overflow-hidden whitespace-nowrap rounded-sm border border-[#8c8c8c]",
  "bg-[linear-gradient(#ffffff,#d9d9d9)] px-1.5 py-1 text-center text-xs",
  "peer-checked:border-[#006bd6] peer-checked:bg-[linear-gradient(#e4f5ff,#79bcff)] peer-checked:font-extrabold peer-checked:text-[#001b37]",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[#006bd6]",
  "max-[520px]:min-h-6 max-[520px]:px-[5px] max-[520px]:py-[3px]",
);
