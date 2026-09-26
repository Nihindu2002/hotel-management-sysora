import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import SiteLayout from './layouts/SiteLayout';
import RoleRoute from './routes/RoleRoute';
import AuthRoute from './routes/AuthRoute';
import CustomerRoute from './routes/CustomerRoute';

// ── Eagerly bundled: the customer-facing site and the auth screens ──
//
// These are what a guest reaches first, so they ship in the entry chunk and
// never trigger a loading fallback. Everything behind the staff dashboard is
// split out below — a signed-out visitor on "/" has no reason to download the
// inventory ledger or the reporting charts.
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/Unauthorized';
import PlaceholderPage from './pages/PlaceholderPage';

import LandingPage from './pages/landing/LandingPage';
import RoomsPage from './pages/site/RoomsPage';
import RoomDetailPage from './pages/site/RoomDetailPage';
import AvailabilityPage from './pages/site/AvailabilityPage';
import BookingWizard from './pages/site/BookingWizard';
import BookingDetail from './pages/site/account/BookingDetail';
import AccountLayout from './pages/site/components/AccountLayout';
import AccountOverview from './pages/site/account/AccountOverview';
import AccountReservations from './pages/site/account/AccountReservations';
import AccountInvoices from './pages/site/account/AccountInvoices';
import AccountInvoiceDetails from './pages/site/account/AccountInvoiceDetails';
import AccountPayments from './pages/site/account/AccountPayments';
import AccountPaymentNew from './pages/site/account/AccountPaymentNew';
import AccountProfile from './pages/site/account/AccountProfile';
import AccountSettings from './pages/site/account/AccountSettings';
import AccountNotifications from './pages/site/account/AccountNotifications';

// ── Split out: the staff dashboard ──
//
// Reports are the reason this matters most. `recharts` is around a third of
// the gzipped bundle and is imported only by the two chart components the
// report pages use, so keeping those two pages lazy keeps the charting library
// out of every other visitor's download.
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'));
const HousekeepingDashboard = lazy(() => import('./pages/housekeeping/HousekeepingDashboard'));
const HousekeepingTasks = lazy(() => import('./pages/housekeeping/HousekeepingTasks'));
const HousekeepingTaskDetails = lazy(() => import('./pages/housekeeping/HousekeepingTaskDetails'));
const HousekeepingTaskCreate = lazy(() => import('./pages/housekeeping/HousekeepingTaskCreate'));
const MaintenanceDashboard = lazy(() => import('./pages/maintenance/MaintenanceDashboard'));
const MaintenanceTasks = lazy(() => import('./pages/maintenance/MaintenanceTasks'));
const MaintenanceTaskDetails = lazy(() => import('./pages/maintenance/MaintenanceTaskDetails'));
const MaintenanceTaskCreate = lazy(() => import('./pages/maintenance/MaintenanceTaskCreate'));
const InventoryDashboardPage = lazy(() => import('./pages/inventory/InventoryDashboardPage'));
const InventoryItems = lazy(() => import('./pages/inventory/InventoryItems'));
const InventoryItemDetails = lazy(() => import('./pages/inventory/InventoryItemDetails'));
const AccountantDashboard = lazy(() => import('./pages/accountant/AccountantDashboard'));
const ManagementDashboard = lazy(() => import('./pages/dashboard/ManagementDashboard'));
const ReportsOverview = lazy(() => import('./pages/reports/ReportsOverview'));
const RevenueReport = lazy(() => import('./pages/reports/RevenueReport'));
const OccupancyReport = lazy(() => import('./pages/reports/OccupancyReport'));
const ExpenseReport = lazy(() => import('./pages/reports/ExpenseReport'));
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));
const FinanceTransactions = lazy(() => import('./pages/finance/FinanceTransactions'));
const FinanceTransactionDetails = lazy(() => import('./pages/finance/FinanceTransactionDetails'));
const Rooms = lazy(() => import('./pages/rooms/Rooms'));
const RoomDetails = lazy(() => import('./pages/rooms/RoomDetails'));
const AdminRooms = lazy(() => import('./pages/rooms/AdminRooms'));
const AdminRoomDetails = lazy(() => import('./pages/rooms/AdminRoomDetails'));
const AdminRoomCreate = lazy(() => import('./pages/rooms/AdminRoomCreate'));
const AdminRoomEdit = lazy(() => import('./pages/rooms/AdminRoomEdit'));
const StaffReservations = lazy(() => import('./pages/staff/StaffReservations'));
const ReservationDetails = lazy(() => import('./pages/reservations/ReservationDetails'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const AdminUserList = lazy(() => import('./pages/admin/AdminUserList'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ══ The LUMI website: public pages and the customer account area ══
            Everything here renders in SiteLayout. Staff never enter it. */}
        <Route element={<SiteLayout />}>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
          <Route path="/book" element={<AvailabilityPage />} />

          {/* Booking flow — customer only, but staff keep the access they had
              before so front desk can still book on a guest's behalf. */}
          <Route
            element={
              <RoleRoute
                allowedRoles={['CUSTOMER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']}
              />
            }
          >
            <Route path="/reservations/new" element={<BookingWizard />} />
            <Route path="/reservations/:reservationId" element={<BookingDetail />} />
          </Route>

          {/* Account area */}
          <Route element={<CustomerRoute />}>
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<AccountOverview />} />
              <Route path="reservations" element={<AccountReservations />} />
              <Route path="invoices" element={<AccountInvoices />} />
              <Route path="invoices/:invoiceId" element={<AccountInvoiceDetails />} />
              <Route path="payments" element={<AccountPayments />} />
              <Route path="payments/new" element={<AccountPaymentNew />} />
              <Route path="profile" element={<AccountProfile />} />
              <Route path="settings" element={<AccountSettings />} />
              <Route path="notifications" element={<AccountNotifications />} />
            </Route>
          </Route>
        </Route>

        {/* ══ Retired customer URLs ══
            Kept as redirects so existing bookmarks, notification links written
            by the backend, and any hardcoded links keep working. */}
        <Route path="/customer" element={<Navigate to="/account" replace />} />
        <Route path="/customer/reservations" element={<Navigate to="/account/reservations" replace />} />
        <Route path="/my-reservations" element={<Navigate to="/account/reservations" replace />} />
        <Route path="/customer/invoices" element={<Navigate to="/account/invoices" replace />} />
        <Route path="/my-invoices" element={<Navigate to="/account/invoices" replace />} />
        <Route path="/customer/payments" element={<Navigate to="/account/payments" replace />} />
        <Route path="/my-payments" element={<Navigate to="/account/payments" replace />} />
        <Route path="/customer/payments/new" element={<Navigate to="/account/payments/new" replace />} />
        <Route path="/customer/profile" element={<Navigate to="/account/profile" replace />} />
        <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
        <Route path="/customer/account" element={<Navigate to="/account/settings" replace />} />

        {/* A specific invoice id cannot be expressed as a static Navigate, so
            this one keeps its param and hands off in the component. */}
        <Route
          path="/customer/invoices/:invoiceId"
          element={<LegacyInvoiceRedirect />}
        />

        {/* ══ Staff dashboard ══ */}
        <Route element={<DashboardLayout />}>
          {/* Notifications — every signed-in staff role owns its own mailbox */}
          <Route element={<AuthRoute />}>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          {/* Management dashboard — ADMIN and MANAGER share it */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/dashboard" element={<ManagementDashboard />} />
          </Route>

          {/* Role Primary Dashboards */}
          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />

            {/* User Management — ADMIN only */}
            <Route path="/users" element={<AdminUserList />} />
            <Route path="/admin/users" element={<AdminUserList />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['MANAGER']} />}>
            <Route path="/manager" element={<ManagerDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['RECEPTIONIST']} />}>
            <Route path="/receptionist" element={<ReceptionistDashboard />} />
          </Route>

          {/* Housekeeping Operations (Admin, Manager, Housekeeping) */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'HOUSEKEEPING']} />}>
            <Route path="/housekeeping" element={<HousekeepingDashboard />} />
            <Route path="/housekeeping/tasks" element={<HousekeepingTasks />} />
            <Route path="/housekeeping/tasks/:taskId" element={<HousekeepingTaskDetails />} />
            <Route path="/housekeeping-tasks" element={<Navigate to="/housekeeping/tasks" replace />} />
          </Route>

          {/* Housekeeping Task Creation (Admin & Manager only) */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/housekeeping/tasks/new" element={<HousekeepingTaskCreate />} />
          </Route>

          {/* Maintenance Operations (Admin, Manager, Receptionist, Maintenance) */}
          <Route
            element={
              <RoleRoute
                allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE']}
              />
            }
          >
            <Route path="/maintenance/tasks" element={<MaintenanceTasks />} />
            <Route path="/maintenance/tasks/:taskId" element={<MaintenanceTaskDetails />} />
            <Route path="/maintenance-tasks" element={<Navigate to="/maintenance/tasks" replace />} />
            <Route path="/maintenance" element={<MaintenanceDashboard />} />
          </Route>

          {/* Maintenance Task Creation (Admin, Manager, Receptionist) */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/maintenance/tasks/new" element={<MaintenanceTaskCreate />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ACCOUNTANT']} />}>
            <Route path="/accountant" element={<AccountantDashboard />} />
          </Route>

          {/* Staff room views.
              /rooms itself is now the public site page, so staff keep their own
              paths — the sidebar and the housekeeping task link point here. */}
          <Route
            element={
              <RoleRoute
                allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE']}
              />
            }
          >
            <Route path="/receptionist/rooms" element={<Rooms />} />
            <Route path="/receptionist/rooms/:roomId" element={<RoomDetails />} />
            <Route path="/staff/rooms/:roomId" element={<RoomDetails />} />
          </Route>

          {/* Staff reservation management */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/reservations" element={<StaffReservations />} />
            <Route path="/admin/reservations" element={<StaffReservations />} />
            <Route path="/manager/reservations" element={<StaffReservations />} />
            <Route path="/receptionist/reservations" element={<StaffReservations />} />
          </Route>

          {/* Staff reservation detail — the customer's equivalent lives at
              /reservations/:reservationId inside the LUMI site. */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/staff/reservations/:reservationId" element={<ReservationDetails />} />
          </Route>

          {/* Staff Room Management (Admin + Manager only) */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/admin/rooms" element={<AdminRooms />} />
            <Route path="/admin/rooms/new" element={<AdminRoomCreate />} />
            <Route path="/admin/rooms/:roomId" element={<AdminRoomDetails />} />
            <Route path="/admin/rooms/:roomId/edit" element={<AdminRoomEdit />} />
            <Route path="/manager/rooms" element={<AdminRooms />} />
            <Route path="/manager/rooms/new" element={<AdminRoomCreate />} />
            <Route path="/manager/rooms/:roomId" element={<AdminRoomDetails />} />
            <Route path="/manager/rooms/:roomId/edit" element={<AdminRoomEdit />} />
          </Route>

          {/* Staff page redirect to User Management Staff tab */}
          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/staff" element={<Navigate to="/admin/users?tab=staff" replace />} />
            <Route path="/staff-management" element={<Navigate to="/admin/users?tab=staff" replace />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']} />}>
            <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
            <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
          </Route>

          {/* Inventory — any staff role with backend read access */}
          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  'ADMIN',
                  'MANAGER',
                  'RECEPTIONIST',
                  'STAFF',
                  'HOUSEKEEPING',
                  'MAINTENANCE',
                ]}
              />
            }
          >
            <Route path="/inventory" element={<InventoryDashboardPage />} />
            <Route path="/inventory/items" element={<InventoryItems />} />
            <Route path="/inventory/items/:itemId" element={<InventoryItemDetails />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} />}>
            <Route path="/finance" element={<FinanceDashboard />} />
            <Route path="/finance/transactions" element={<FinanceTransactions />} />
            <Route
              path="/finance/transactions/:transactionId"
              element={<FinanceTransactionDetails />}
            />
          </Route>

          {/* Reports — every endpoint they read is ADMIN/MANAGER only, so the
              route guard matches rather than showing a page of 403s. */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/reports" element={<ReportsOverview />} />
            <Route path="/reports/revenue" element={<RevenueReport />} />
            <Route path="/reports/occupancy" element={<OccupancyReport />} />
            <Route path="/reports/expenses" element={<ExpenseReport />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Carries the invoice id across from the retired /customer/invoices/:id URL. */
function LegacyInvoiceRedirect() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <Navigate to={`/account/invoices/${invoiceId}`} replace />;
}

export default App;
