import { cn } from "./classNames";

type MascotMood = "default" | "disappointed" | "notFound";

type MascotProps = {
  className?: string;
  mood?: MascotMood;
  title: string;
};

export function Mascot({ className, mood = "default", title }: MascotProps) {
  return (
    <svg
      aria-label={title}
      className={cn("h-auto w-full max-w-[168px]", className)}
      role="img"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        fill="none"
        stroke="#111111"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      >
        <path d="M106 72 Q128 55 150 72" />
        <path d="M120 84 Q128 78 136 84" transform="translate(0, -2)" />
        <circle cx="128" cy="94" fill="#111111" r="3.5" stroke="none" />
        <rect height="104" rx="24" width="128" x="64" y="104" />
        <rect height="58" rx="16" width="88" x="84" y="126" />
        <MascotFace mood={mood} />
        <circle cx="182" cy="136" fill="#111111" r="3.5" stroke="none" />
        <circle cx="182" cy="152" fill="#111111" r="3.5" stroke="none" />
        <path d="M64 152 Q50 150 44 140" />
        <path d="M192 152 Q206 150 212 140" />
        <path d="M108 208 L102 226" />
        <path d="M148 208 L154 226" />
        <path d="M94 226 H108" />
        <path d="M148 226 H162" />
      </g>
    </svg>
  );
}

type MascotFaceProps = {
  mood: MascotMood;
};

function MascotFace({ mood }: MascotFaceProps) {
  if (mood === "notFound") {
    return (
      <>
        <path d="M104 146 L116 158" />
        <path d="M116 146 L104 158" />
        <path d="M140 146 L152 158" />
        <path d="M152 146 L140 158" />
        <path d="M116 170 H140" />
      </>
    );
  }

  if (mood === "disappointed") {
    return (
      <>
        <circle cx="110" cy="152" fill="#111111" r="4.5" stroke="none" />
        <circle cx="146" cy="152" fill="#111111" r="4.5" stroke="none" />
        <path d="M116 174 Q128 166 140 174" />
      </>
    );
  }

  return (
    <>
      <circle cx="110" cy="152" fill="#111111" r="4.5" stroke="none" />
      <circle cx="146" cy="152" fill="#111111" r="4.5" stroke="none" />
      <path d="M116 166 Q128 174 140 166" />
    </>
  );
}
