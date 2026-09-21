import SiteLink from './SiteLink';

const FOOTER_NAV = [
  { label: 'Stay', href: '/#stay' },
  { label: 'Rooms', href: '/rooms' },
  { label: 'Explore', href: '/#explore' },
  { label: 'Contact', href: '/#contact' },
] as const;

const NAV_LINK =
  'text-[11px] uppercase tracking-[0.22em] text-muted transition-colors duration-300 hover:text-ink';

const META_LINK =
  'text-[10px] uppercase tracking-[0.2em] text-muted transition-colors duration-300 hover:text-ink';

/** The LUMI site footer, shared across every customer-facing page. */
export default function SiteFooter() {
  return (
    <footer id="contact" className="scroll-mt-10 border-t border-line px-6 py-14 md:px-12 md:py-16">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs text-muted">
            <a href="mailto:hello@lumi-retreat.com" className="hover:text-ink">
              hello@lumi-retreat.com
            </a>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <a href="tel:+94112345678" className="hover:text-ink">
              +94 11 234 5678
            </a>
          </p>
        </div>

        <div className="flex flex-col gap-7 md:items-end">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {FOOTER_NAV.map((item) => (
              <SiteLink key={item.label} to={item.href} className={NAV_LINK}>
                {item.label}
              </SiteLink>
            ))}
          </nav>

          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className={META_LINK}
            >
              Instagram
            </a>
            <span className={META_LINK}>Privacy</span>
            <span className={META_LINK}>Terms</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
