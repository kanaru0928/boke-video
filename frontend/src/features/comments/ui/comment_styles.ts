import { cn } from "../../../shared/ui/classNames";
import type { CommentDirection } from "../model/types";

const commentBaseClassName = cn(
  "absolute max-w-[70%] whitespace-nowrap font-extrabold leading-[1.2] will-change-transform",
  "[text-shadow:2px_2px_0_#000000,-1px_-1px_0_#000000,1px_-1px_0_#000000,-1px_1px_0_#000000]",
);

const commentDirectionClassNames: Record<CommentDirection, string> = {
  bottomToTop: "bottom-0 [writing-mode:vertical-rl]",
  fixedBottom: "left-1/2 bottom-3 -translate-x-1/2",
  fixedTop: "left-1/2 top-3 -translate-x-1/2",
  leftToRight: "right-full",
  rightToLeft: "left-full",
  topToBottom: "top-0 [writing-mode:vertical-rl]",
};

export function commentClassName(direction: CommentDirection): string {
  return cn(commentBaseClassName, commentDirectionClassNames[direction]);
}
