import { Send } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/ui/classNames";
import { textareaClassName } from "../../shared/ui/styles";
import { directionLabel } from "../comments/comment_labels";
import {
  type CommentDirection,
  type CommentFontSize,
  commentColors,
  commentDirections,
} from "../comments/types";
import {
  choiceChipInputClassName,
  choiceChipLabelClassName,
  choiceChipTextClassName,
  choiceFieldClassName,
  colorButtonClassName,
  colorRowClassName,
  commentComposeClassName,
  commentFormClassName,
  commentOptionsClassName,
  commentSubmitButtonClassName,
  directionChoiceGridClassName,
  selectedColorButtonClassName,
  sizeChoiceGridClassName,
} from "./watchStyles";

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
      className={commentFormClassName}
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) {
          return;
        }
        onSubmit();
      }}
    >
      <div className={commentComposeClassName}>
        <textarea
          className={textareaClassName}
          disabled={disabled}
          maxLength={100}
          onChange={(event) => onBodyChange(event.currentTarget.value)}
          onKeyDown={onShortcut}
          placeholder={disabled ? "配信は終了しました" : "コメント"}
          required
          value={body}
        />
        <Button
          className={commentSubmitButtonClassName}
          disabled={disabled}
          primary
          type="submit"
        >
          <Send aria-hidden="true" size={18} />
          コメント
        </Button>
      </div>
      <div className={commentOptionsClassName}>
        <fieldset className={choiceFieldClassName}>
          <legend>方向</legend>
          <div className={directionChoiceGridClassName}>
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
        <fieldset className={choiceFieldClassName}>
          <legend>大きさ</legend>
          <div className={sizeChoiceGridClassName}>
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
        <div className={colorRowClassName}>
          {commentColors.map((color) => (
            <Button
              aria-label={color}
              className={cn(
                colorButtonClassName,
                color === selectedColor && selectedColorButtonClassName,
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
    <label className={choiceChipLabelClassName}>
      <input
        checked={checked}
        className={choiceChipInputClassName}
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
