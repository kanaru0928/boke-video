import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./classNames";

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className, ...props }: TextInputProps) {
  return <input className={cn(formControlClassName, className)} {...props} />;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        formControlClassName,
        "min-h-[42px] max-h-[130px] resize-y max-[520px]:min-h-[38px]",
        "disabled:cursor-not-allowed disabled:bg-[#eeeeee] disabled:text-[#777777]",
        className,
      )}
      {...props}
    />
  );
}

const formControlClassName = cn(
  "w-full rounded-none border border-[#8d8d8d] bg-white px-[7px] py-[5px] text-[#111111]",
  "shadow-[inset_1px_1px_2px_#c4c4c4]",
);
