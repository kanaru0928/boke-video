import {
  siteMarkClassName,
  siteMarkMainClassName,
  siteMarkSubClassName,
  topbarClassName,
  topnavClassName,
  topnavLinkClassName,
} from "./styles";

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
    <header className={topbarClassName}>
      <a className={siteMarkClassName} href="/">
        <span className={siteMarkMainClassName}>Boke Video</span>
        <span className={siteMarkSubClassName}>{section}</span>
      </a>
      <nav className={topnavClassName} aria-label="メニュー">
        {links.map((link) => (
          <a className={topnavLinkClassName} href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
