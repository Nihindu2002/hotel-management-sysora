import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import NavIcon from '../components/NavIcon';
import NotificationBell from '../components/NotificationBell';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-xs md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:hidden"
            aria-label="Toggle Navigation"
          >
            <NavIcon name="menu" className="h-6 w-6" />
          </button>

          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
            <span className="text-indigo-600">★</span> Hotel Management
          </Link>
        </div>

        {/* User / Logout */}
        <div className="flex items-center gap-4">
          {user && <NotificationBell />}

          {user && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-800">
                {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
              </p>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Layout (Sidebar + Page Content) ── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
