import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import RoleRoute from './routes/RoleRoute';
import AuthRoute from './routes/AuthRoute';

// ── Eagerly bundled: the sign-in screen ──
//
// Sign-in is the application's entry point, so it ships in the entry chunk and
// never triggers a loading fallback.
import Login from './pages/auth/Login';
import Unauthorized from './pages/Unauthorized';

// ── Split out: everything behind the dashboard ──
//
// Reports are the reason this matters most: `recharts` is around a third of the
// gzipped bundle and is imported only by the chart components the report pages
// use, so keeping those lazy keeps the charting library out of every other
// screen's download.
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
const ReservationCreate = lazy(() => import('./pages/staff/ReservationCreate'));
const ReservationDetails = lazy(() => import('./pages/reservations/ReservationDetails'));
const CheckoutBill = lazy(() => import('./pages/staff/CheckoutBill'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const InvoiceDetails = lazy(() => import('./pages/invoices/InvoiceDetails'));
const Payments = lazy(() => import('./pages/payments/Payments'));
const StaffList = lazy(() => import('./pages/staff/StaffList'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const AdminUserList = lazy(() => import('./pages/admin/AdminUserList'));

const FRONT_DESK = ['ADMIN', 'MANAGER', 'RECEPTIONIST'] as const;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sign-in is the entry point — there is no public landing page. */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<DashboardLayout />}>
          {/* Notifications — every signed-in role owns its own mailbox */}
          <Route element={<AuthRoute />}>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          {/* Management dashboard — ADMIN and MANAGER share it */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/dashboard" element={<ManagementDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/manager" element={<ManagerDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['RECEPTIONIST']} />}>
            <Route path="/receptionist" element={<ReceptionistDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ACCOUNTANT']} />}>
            <Route path="/accountant" element={<AccountantDashboard />} />
          </Route>

          {/* ── Housekeeping ── */}
          <Route
            element={
              <RoleRoute
                allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING']}
              />
            }
          >
            <Route path="/housekeeping" element={<HousekeepingDashboard />} />
            <Route path="/housekeeping/tasks" element={<HousekeepingTasks />} />
            <Route path="/housekeeping/tasks/:taskId" element={<HousekeepingTaskDetails />} />
            <Route path="/housekeeping-tasks" element={<Navigate to="/housekeeping/tasks" replace />} />
          </Route>

          {/* Raising a housekeeping task is an ADMIN/MANAGER action. */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/housekeeping/tasks/new" element={<HousekeepingTaskCreate />} />
          </Route>

          {/* ── Maintenance ── */}
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

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/maintenance/tasks/new" element={<MaintenanceTaskCreate />} />
          </Route>

          {/* ── Rooms ── */}
          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  'ADMIN',
                  'MANAGER',
                  'RECEPTIONIST',
                  'HOUSEKEEPING',
                  'MAINTENANCE',
                ]}
              />
            }
          >
            <Route path="/receptionist/rooms" element={<Rooms />} />
            <Route path="/receptionist/rooms/:roomId" element={<RoomDetails />} />
            <Route path="/staff/rooms/:roomId" element={<RoomDetails />} />
          </Route>

          {/* Room inventory is ADMIN/MANAGER territory. */}
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

          {/* ── Reservations ──
              Booking, check-in and checkout are front-desk work. The booking
              form and the checkout screen are staff-only; there is no
              customer-facing equivalent anywhere in the app. */}
          <Route element={<RoleRoute allowedRoles={[...FRONT_DESK]} />}>
            <Route path="/reservations" element={<StaffReservations />} />
            <Route path="/admin/reservations" element={<StaffReservations />} />
            <Route path="/manager/reservations" element={<StaffReservations />} />
            <Route path="/receptionist/reservations" element={<StaffReservations />} />
            <Route path="/reservations/new" element={<ReservationCreate />} />
            <Route path="/staff/reservations/:reservationId" element={<ReservationDetails />} />
            <Route path="/staff/reservations/:reservationId/checkout" element={<CheckoutBill />} />
          </Route>

          {/* ── Invoices & payments ── */}
          <Route
            element={
              <RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT']} />
            }
          >
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetails />} />
            <Route path="/payments" element={<Payments />} />
          </Route>

          {/* ── Inventory ── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/inventory" element={<InventoryDashboardPage />} />
            <Route path="/inventory/items" element={<InventoryItems />} />
            <Route path="/inventory/items/:itemId" element={<InventoryItemDetails />} />
          </Route>

          {/* ── Finance ── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} />}>
            <Route path="/finance" element={<FinanceDashboard />} />
            <Route path="/finance/transactions" element={<FinanceTransactions />} />
            <Route
              path="/finance/transactions/:transactionId"
              element={<FinanceTransactionDetails />}
            />
          </Route>

          {/* ── Reports ── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} />}>
            <Route path="/reports" element={<ReportsOverview />} />
            <Route path="/reports/revenue" element={<RevenueReport />} />
            <Route path="/reports/occupancy" element={<OccupancyReport />} />
            <Route path="/reports/expenses" element={<ExpenseReport />} />
          </Route>

          {/* ── Staff roster ── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/staff" element={<StaffList />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* ── User accounts ── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/users" element={<AdminUserList />} />
            <Route path="/admin/users" element={<AdminUserList />} />
            <Route path="/admin/staff" element={<Navigate to="/staff" replace />} />
            <Route path="/staff-management" element={<Navigate to="/staff" replace />} />
          </Route>
        </Route>

        {/* Anything else — a stale bookmark, a retired customer URL — goes to
            sign-in, which routes a signed-in user on to their dashboard. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
