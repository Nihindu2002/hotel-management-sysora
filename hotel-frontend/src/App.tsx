import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import SiteLayout from './layouts/SiteLayout';
import RoleRoute from './routes/RoleRoute';
import AuthRoute from './routes/AuthRoute';
import CustomerRoute from './routes/CustomerRoute';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import HousekeepingDashboard from './pages/housekeeping/HousekeepingDashboard';
import HousekeepingTasks from './pages/housekeeping/HousekeepingTasks';
import HousekeepingTaskDetails from './pages/housekeeping/HousekeepingTaskDetails';
import HousekeepingTaskCreate from './pages/housekeeping/HousekeepingTaskCreate';
import MaintenanceDashboard from './pages/maintenance/MaintenanceDashboard';
import MaintenanceTasks from './pages/maintenance/MaintenanceTasks';
import MaintenanceTaskDetails from './pages/maintenance/MaintenanceTaskDetails';
import MaintenanceTaskCreate from './pages/maintenance/MaintenanceTaskCreate';
import InventoryDashboardPage from './pages/inventory/InventoryDashboardPage';
import InventoryItems from './pages/inventory/InventoryItems';
import InventoryItemDetails from './pages/inventory/InventoryItemDetails';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import ManagementDashboard from './pages/dashboard/ManagementDashboard';
import ReportsOverview from './pages/reports/ReportsOverview';
import RevenueReport from './pages/reports/RevenueReport';
import OccupancyReport from './pages/reports/OccupancyReport';
import ExpenseReport from './pages/reports/ExpenseReport';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import FinanceTransactions from './pages/finance/FinanceTransactions';
import FinanceTransactionDetails from './pages/finance/FinanceTransactionDetails';
import Unauthorized from './pages/Unauthorized';
import PlaceholderPage from './pages/PlaceholderPage';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// ── Public + customer LUMI site ──
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

// ── Staff: rooms and reservations ──
import Rooms from './pages/rooms/Rooms';
import RoomDetails from './pages/rooms/RoomDetails';
import AdminRooms from './pages/rooms/AdminRooms';
import AdminRoomDetails from './pages/rooms/AdminRoomDetails';
import AdminRoomCreate from './pages/rooms/AdminRoomCreate';
import AdminRoomEdit from './pages/rooms/AdminRoomEdit';
import StaffReservations from './pages/staff/StaffReservations';
import ReservationDetails from './pages/reservations/ReservationDetails';

// Notifications (every authenticated role)
import NotificationsPage from './pages/notifications/NotificationsPage';

// User management (Admin only)
import AdminUserList from './pages/admin/AdminUserList';

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
