import { useAuth } from '../../hooks/useAuth';
import { getRoleRedirectPath } from '../../utils/roleRedirect';
import SiteLink from './SiteLink';

/**
 * Section links point at the landing page's anchors rather than bare `#ids`,
 * so they also work from /rooms, /account and the rest of the site.
 *
 * "Explore" leads to the room listing instead: it is the step guests are
 * looking for when they reach for it, and the surrounding-area copy sits on
 * the landing page below the fold anyway.
 */
const SITE_NAV = [
  { label: 'Stay', href: '/#stay' },
  { label: 'Explore', href: '/rooms' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
] as const;

const NAV_LINK =
  'text-[11px] uppercase tracking-[0.22em] text-muted transition-colors duration-300 hover:text-ink';

const PILL =
  'rounded-full border border-line px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-ink transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white';

/**
 * The LUMI site header, shared by the landing page and every customer-facing
 * page. Staff never see it — they use DashboardLayout.
 */
export default function SiteHeader() {
  const { user, loading } = useAuth();

  // Customers have no dashboard: the account area is their home inside the app.
  const accountHref = user
    ? user.role === 'CUSTOMER'
      ? '/account'
      : getRoleRedirectPath(user.role)
    : '/login';

  const accountLabel = user
    ? user.role === 'CUSTOMER'
      ? 'My account'
      : user.firstName || 'Dashboard'
    : 'Sign in';

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-7 md:px-12 md:py-9">
      {/* Section links are hidden on small screens; the footer repeats them. */}
      <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
        {SITE_NAV.map((item) => (
          <SiteLink key={item.label} to={item.href} className={NAV_LINK}>
            {item.label}
          </SiteLink>
        ))}
      </nav>

      {/* ml-auto keeps this hard right on small screens, where the nav is
          display:none and justify-between has nothing left to push against. */}
      <div className="ml-auto">
        {/* Reserves its own width while auth resolves, so the header doesn't
            shift once the profile arrives. */}
        {loading ? (
          <span className="block h-9 w-24" aria-hidden="true" />
        ) : (
          <SiteLink to={accountHref} className={PILL}>
            {accountLabel}
          </SiteLink>
        )}
      </div>
    </header>
  );
}
