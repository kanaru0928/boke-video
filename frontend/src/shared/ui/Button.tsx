import type { ButtonHTMLAttributes } from "react";
import { buttonClassName } from "./styles";

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
