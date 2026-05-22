import { cn } from "../../../shared/ui/classNames";

type AdminStatusLineTone = "neutral" | "success" | "error";

type AdminStatusLineProps = {
  className?: string;
  message: string;
  tone?: AdminStatusLineTone;
};

export function AdminStatusLine({
  className,
  message,
  tone = "neutral",
}: AdminStatusLineProps) {
  if (message === "") {
    return null;
  }

  return (
    <p
      className={cn(
        "pointer-events-none m-0 border border-[#8f8f8f] bg-[#ffffe1] px-[7px] py-[3px] text-xs",
        "shadow-[1px_1px_0_#ffffff,2px_2px_0_rgb(0_0_0_/_18%)]",
        "animate-[admin-status-fade_3.2s_ease-out_forwards]",
        tone === "neutral" && "text-[#555555]",
        tone === "success" && "text-[#0b5f24]",
        tone === "error" && "text-[#b00020]",
        className,
      )}
    >
      {message}
    </p>
  );
}
