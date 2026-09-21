import { Outlet } from 'react-router-dom';
import SiteFooter from '../components/site/SiteFooter';
import SiteHeader from '../components/site/SiteHeader';

/**
 * Chrome for everything customer-facing — the LUMI marketing pages and the
 * signed-in account area. Staff never use this; they render inside
 * DashboardLayout, which keeps the sidebar and top bar they rely on.
 */
export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
