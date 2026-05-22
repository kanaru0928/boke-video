import { MessageSquare } from "lucide-react";
import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../shared/ui/classNames";
import { settingsPopoverPosition } from "../lib/settings_popover_position";
import {
  autoQualityId,
  type PlaybackQualityOption,
} from "../lib/stream_quality";

type PlayerSettingsPopoverProps = {
  anchorRef: RefObject<HTMLElement | null>;
  commentsVisible: boolean;
  isOpen: boolean;
  playbackQualities: PlaybackQualityOption[];
  selectedQualityId: string;
  onCommentsVisibleChange: (visible: boolean) => void;
  onQualityChange: (qualityId: string) => void;
};

export const settingsChipClassName = cn(
  "fixed z-[80] max-h-[calc(100dvh-16px)] w-[312px] max-w-[calc(100vw-12px)] overflow-auto border border-[#666666] bg-[#050505] p-[7px] text-xs text-white",
  "shadow-[2px_2px_0_rgb(0_0_0_/_65%),inset_1px_1px_0_rgb(255_255_255_/_18%)] max-[520px]:right-0 max-[520px]:w-[292px] max-[380px]:w-[262px]",
);

const settingsChipRowClassName = cn(
  "m-0 grid grid-cols-[70px_minmax(0,1fr)] items-start gap-[7px] border-0 border-b border-[#333333] px-0 py-[7px] last:border-b-0",
  "[&_legend]:contents [&_legend]:pt-[4px] [&_legend]:font-extrabold [&_legend]:text-white max-[520px]:grid-cols-1 max-[520px]:gap-[5px]",
);

const settingsChipSegmentClassName = cn(
  "flex min-w-0 flex-wrap justify-end gap-[4px] [&_label]:min-w-0",
  "max-[520px]:grid max-[520px]:grid-cols-2 max-[520px]:justify-stretch max-[520px]:[&_label]:w-full",
);

const settingsChipSegmentTextClassName = cn(
  "grid min-h-[26px] max-w-full cursor-pointer select-none grid-flow-col place-items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[13px] border border-[#3f3f3f]",
  "bg-[linear-gradient(#4d4d4d,#1b1b1b)] px-[9px] py-[4px] text-[11px] leading-none text-[#eeeeee]",
  "peer-checked:border-[#7fbdff] peer-checked:bg-[linear-gradient(#4dc7ff,#006fd8)] peer-checked:font-extrabold peer-checked:text-white",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[#ffffff]",
);

export function PlayerSettingsPopover({
  anchorRef,
  commentsVisible,
  isOpen,
  playbackQualities,
  selectedQualityId,
  onCommentsVisibleChange,
  onQualityChange,
}: PlayerSettingsPopoverProps) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const updatePosition = (): void => {
      const anchor = anchorRef.current;
      if (anchor === null) {
        return;
      }
      const nextPosition = settingsPopoverPosition(
        anchor.getBoundingClientRect(),
        {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      );
      setPosition(nextPosition);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, isOpen]);

  if (!isOpen) {
    return null;
  }
  const checkedQualityId = playbackQualities.some(
    (quality) => quality.id === selectedQualityId,
  )
    ? selectedQualityId
    : autoQualityId;
  if (position === null) {
    return null;
  }
  return createPortal(
    <div
      className={settingsChipClassName}
      role="menu"
      aria-label="設定"
      style={position}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="m-0 border-b border-[#666666] pb-[6px] text-sm font-extrabold [text-shadow:1px_1px_0_#000000]">
        設定
      </p>
      <fieldset className={settingsChipRowClassName}>
        <legend>画質切替</legend>
        {playbackQualities.length === 0 ? (
          <span className="min-h-[22px] select-none rounded-[10px] border border-[#333333] bg-[#111111] px-[8px] py-[5px] text-center text-[11px] leading-none text-[#bbbbbb]">
            再生待ち
          </span>
        ) : (
          <div className={settingsChipSegmentClassName}>
            {playbackQualities.map((quality) => (
              <label key={quality.id}>
                <input
                  checked={checkedQualityId === quality.id}
                  className="peer pointer-events-none absolute m-0 h-px w-px opacity-0"
                  name="playback-quality"
                  type="radio"
                  value={quality.id}
                  onChange={() => onQualityChange(quality.id)}
                />
                <span className={settingsChipSegmentTextClassName}>
                  {quality.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className={settingsChipRowClassName}>
        <legend>コメント</legend>
        <div className={settingsChipSegmentClassName}>
          <label>
            <input
              checked={!commentsVisible}
              className="peer pointer-events-none absolute m-0 h-px w-px opacity-0"
              name="comment-visible"
              type="radio"
              onChange={() => onCommentsVisibleChange(false)}
            />
            <span className={settingsChipSegmentTextClassName}>非表示</span>
          </label>
          <label>
            <input
              checked={commentsVisible}
              className="peer pointer-events-none absolute m-0 h-px w-px opacity-0"
              name="comment-visible"
              type="radio"
              onChange={() => onCommentsVisibleChange(true)}
            />
            <span className={settingsChipSegmentTextClassName}>
              <MessageSquare aria-hidden="true" size={12} />
              表示
            </span>
          </label>
        </div>
      </fieldset>
    </div>,
    document.body,
  );
}
