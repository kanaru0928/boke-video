import { cn } from "./classNames";

type HeaderLink = {
  href: string;
  label: string;
};

type AppHeaderProps = {
  section: string;
  links: HeaderLink[];
};

export function AppHeader({ section, links }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "mb-[9px] grid grid-cols-[240px_1fr] items-end gap-[10px] border-b border-[#222222]",
        "max-[860px]:grid-cols-1 max-[520px]:mb-[7px]",
      )}
    >
      <a className="grid gap-0 pb-[5px] text-inherit no-underline" href="/">
        <span
          className={cn(
            "text-[32px] leading-[0.86] font-black tracking-normal",
            "[text-shadow:2px_2px_0_#ffffff,3px_3px_0_#8a8a8a]",
            "max-[520px]:text-2xl",
          )}
        >
          Boke Video
        </span>
        <span className="font-[Arial,sans-serif] text-[11px] font-extrabold tracking-[1px] max-[520px]:text-[10px]">
          {section}
        </span>
      </a>
      <nav
        className={cn(
          "flex flex-wrap justify-end gap-0 border border-b-0 border-[#3f3f3f]",
          "bg-[linear-gradient(#8b8b8b,#111111_48%,#545454)] max-[860px]:justify-start",
        )}
        aria-label="メニュー"
      >
        {links.map((link) => (
          <a
            className={cn(
              "border-l border-[#777777] px-3 py-[7px] text-[13px] text-white underline first:border-l-0",
              "whitespace-nowrap [text-shadow:1px_1px_0_#000000] max-[520px]:px-3 max-[520px]:py-1.5",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
