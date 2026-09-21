import { NavLink, Outlet } from 'react-router-dom';

/**
 * Sub-navigation for the signed-in account area, nested inside SiteLayout so
 * the LUMI header and footer stay put while only this section changes.
 */

const ACCOUNT_NAV = [
  { label: 'Overview', to: '/account', end: true },
  { label: 'Reservations', to: '/account/reservations', end: false },
  { label: 'Invoices', to: '/account/invoices', end: false },
  { label: 'Payments', to: '/account/payments', end: false },
  { label: 'Profile', to: '/account/profile', end: false },
  { label: 'Settings', to: '/account/settings', end: false },
] as const;

export default function AccountLayout() {
  return (
    <div className="px-6 pb-24 md:px-12 md:pb-32">
      {/* Horizontal on wide screens, wrapping on narrow — the same links the
          dashboard sidebar carries for staff, restated as a website nav. */}
      <nav
        aria-label="Account"
        className="flex flex-wrap gap-x-8 gap-y-3 border-b border-line py-6"
      >
        {ACCOUNT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `text-[11px] uppercase tracking-[0.22em] transition-colors duration-300 ${
                isActive ? 'text-gold-ink' : 'text-muted hover:text-ink'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-10">
        <Outlet />
      </div>
    </div>
  );
}
