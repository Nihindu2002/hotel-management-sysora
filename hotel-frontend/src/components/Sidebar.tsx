import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAVIGATION_ITEMS } from '../config/navigation';
import NavIcon from './NavIcon';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allowedItems = NAVIGATION_ITEMS.filter(
    (item) => user?.role && item.allowedRoles.includes(user.role),
  );

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white px-3 py-4">
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Navigation
        </div>
        <nav className="space-y-1">
          {allowedItems.map((item) => (
            <NavLink
              key={`${item.label}-${item.path}`}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="border-t border-gray-200 pt-4">
        {user && (
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-semibold text-gray-900">
              {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                {user.role}
              </span>
              <span className="truncate text-xs text-gray-500">{user.email}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <NavIcon name="logout" className="h-5 w-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:block">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-over panel */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

