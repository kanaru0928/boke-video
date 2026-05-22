import { Send } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/ui/classNames";
import { Textarea } from "../../../shared/ui/FormControl";
import { directionLabel } from "../../comments/lib/comment_labels";
import {
  type CommentDirection,
  type CommentFontSize,
  commentColors,
  commentDirections,
} from "../../comments/model/types";

type CommentFormProps = {
  body: string;
  disabled: boolean;
  selectedColor: string;
  selectedDirection: CommentDirection;
  selectedSize: CommentFontSize;
  onBodyChange: (body: string) => void;
  onColorChange: (color: string) => void;
  onDirectionChange: (direction: CommentDirection) => void;
  onShortcut: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSizeChange: (size: CommentFontSize) => void;
  onSubmit: () => void;
};

const commentSizeOptions: { label: string; value: CommentFontSize }[] = [
  { label: "小", value: "small" },
  { label: "中", value: "medium" },
  { label: "大", value: "large" },
];

const choiceChipTextClassName = cn(
  "grid min-h-[26px] min-w-0 cursor-pointer select-none place-items-center overflow-hidden whitespace-nowrap rounded-sm border border-[#8c8c8c]",
  "bg-[linear-gradient(#ffffff,#d9d9d9)] px-1.5 py-1 text-center text-xs",
  "peer-checked:border-[#006bd6] peer-checked:bg-[linear-gradient(#e4f5ff,#79bcff)] peer-checked:font-extrabold peer-checked:text-[#001b37]",
  "peer-disabled:cursor-not-allowed peer-disabled:border-[#aaaaaa] peer-disabled:bg-[linear-gradient(#eeeeee,#dddddd)] peer-disabled:text-[#777777] peer-disabled:opacity-65",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[#006bd6]",
  "max-[520px]:min-h-6 max-[520px]:px-[5px] max-[520px]:py-[3px]",
);

export function CommentForm({
  body,
  disabled,
  selectedColor,
  selectedDirection,
  selectedSize,
  onBodyChange,
  onColorChange,
  onDirectionChange,
  onShortcut,
  onSizeChange,
  onSubmit,
}: CommentFormProps) {
  return (
    <form
      className="grid gap-[5px] pt-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) {
          return;
        }
        onSubmit();
      }}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_118px] gap-[5px] max-[520px]:grid-cols-1">
        <Textarea
          disabled={disabled}
          maxLength={100}
          onChange={(event) => onBodyChange(event.currentTarget.value)}
          onKeyDown={onShortcut}
          placeholder={disabled ? "配信は終了しました" : "コメント"}
          required
          value={body}
        />
        <Button
          className="min-h-[42px] min-w-0 max-w-full px-2 text-[15px] max-[520px]:min-h-[38px] max-[520px]:gap-[4px] max-[520px]:px-2 max-[520px]:text-sm"
          disabled={disabled}
          primary
          type="submit"
        >
          <Send aria-hidden="true" size={18} />
          コメント
        </Button>
      </div>
      <div
        className={cn(
          "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(150px,0.8fr)_minmax(150px,auto)] items-start gap-2",
          "max-[640px]:grid-cols-1 max-[640px]:gap-[5px]",
        )}
      >
        <fieldset className="m-0 min-w-0 border border-[#b0b0b0] bg-[#f8f8f8] p-[5px] max-[520px]:p-1 [&_legend]:px-1 [&_legend]:text-xs [&_legend]:font-extrabold">
          <legend>方向</legend>
          <div className="grid grid-cols-3 gap-1 max-[520px]:grid-cols-2">
            {commentDirections.map((direction) => (
              <ChoiceChip
                checked={direction === selectedDirection}
                disabled={disabled}
                key={direction}
                name="comment-direction"
                onChange={() => onDirectionChange(direction)}
                text={directionLabel(direction)}
                value={direction}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 min-w-0 border border-[#b0b0b0] bg-[#f8f8f8] p-[5px] max-[520px]:p-1 [&_legend]:px-1 [&_legend]:text-xs [&_legend]:font-extrabold">
          <legend>大きさ</legend>
          <div className="grid grid-cols-3 gap-1">
            {commentSizeOptions.map((size) => (
              <ChoiceChip
                checked={size.value === selectedSize}
                disabled={disabled}
                key={size.value}
                name="comment-size"
                onChange={() => onSizeChange(size.value)}
                text={size.label}
                value={size.value}
              />
            ))}
          </div>
        </fieldset>
        <div className="flex min-w-0 flex-wrap gap-[5px] border border-[#b0b0b0] bg-[#f8f8f8] p-1.5 max-[640px]:p-1">
          {commentColors.map((color) => (
            <Button
              aria-label={color}
              className={cn(
                "h-[25px] min-h-[25px] w-[25px] border-[#777777] bg-none p-0 shadow-[inset_1px_1px_0_rgb(255_255_255_/_70%),inset_-1px_-1px_0_rgb(0_0_0_/_35%)] max-[520px]:h-[22px] max-[520px]:min-h-[22px] max-[520px]:w-[22px]",
                color === selectedColor &&
                  "outline-2 outline-offset-2 outline-[#006bd6]",
              )}
              disabled={disabled}
              key={color}
              onClick={() => onColorChange(color)}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </form>
  );
}

type ChoiceChipProps<T extends string> = {
  checked: boolean;
  disabled: boolean;
  name: string;
  onChange: () => void;
  text: string;
  value: T;
};

function ChoiceChip<T extends string>({
  checked,
  disabled,
  name,
  onChange,
  text,
  value,
}: ChoiceChipProps<T>) {
  return (
    <label className="relative block min-w-0">
      <input
        checked={checked}
        className="peer pointer-events-none absolute m-0 h-px w-px opacity-0"
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span className={choiceChipTextClassName}>{text}</span>
    </label>
  );
}
