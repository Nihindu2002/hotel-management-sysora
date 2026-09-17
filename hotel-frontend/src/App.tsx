import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RootRedirect from './routes/RootRedirect';
import DashboardLayout from './layouts/DashboardLayout';
import RoleRoute from './routes/RoleRoute';

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
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Unauthorized from './pages/Unauthorized';
import PlaceholderPage from './pages/PlaceholderPage';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Room pages
import Rooms from "./pages/rooms/Rooms";
import RoomDetails from "./pages/rooms/RoomDetails";
import AdminRooms from "./pages/rooms/AdminRooms";
import AdminRoomDetails from "./pages/rooms/AdminRoomDetails";
import AdminRoomCreate from "./pages/rooms/AdminRoomCreate";
import AdminRoomEdit from "./pages/rooms/AdminRoomEdit";

// Reservation & customer pages
import ReservationCreate from "./pages/customer/ReservationCreate";
import CustomerReservations from "./pages/customer/CustomerReservations";
import CustomerInvoices from "./pages/customer/CustomerInvoices";
import CustomerInvoiceDetails from "./pages/customer/CustomerInvoiceDetails";
import CustomerPaymentNew from "./pages/customer/CustomerPaymentNew";
import CustomerPayments from "./pages/customer/CustomerPayments";

// Staff & reservation management
import StaffReservations from "./pages/staff/StaffReservations";
import ReservationDetails from "./pages/reservations/ReservationDetails";

// User management (Admin only)
import AdminUserList from "./pages/admin/AdminUserList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<DashboardLayout />}>
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
          </Route>

          {/* Maintenance Dashboard (Admin, Manager, Receptionist, Maintenance) */}
          <Route
            element={
              <RoleRoute
                allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE']}
              />
            }
          >
            <Route path="/maintenance" element={<MaintenanceDashboard />} />
          </Route>

          {/* Maintenance Task Creation (Admin, Manager, Receptionist) */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/maintenance/tasks/new" element={<MaintenanceTaskCreate />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ACCOUNTANT']} />}>
            <Route path="/accountant" element={<AccountantDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/reservations" element={<CustomerReservations />} />
            <Route path="/my-reservations" element={<CustomerReservations />} />
            <Route path="/customer/invoices" element={<CustomerInvoices />} />
            <Route path="/customer/invoices/:invoiceId" element={<CustomerInvoiceDetails />} />
            <Route path="/my-invoices" element={<CustomerInvoices />} />
            <Route path="/customer/payments" element={<CustomerPayments />} />
            <Route path="/customer/payments/new" element={<CustomerPaymentNew />} />
            <Route path="/my-payments" element={<CustomerPayments />} />
            <Route path="/profile" element={<PlaceholderPage title="My Profile" />} />
          </Route>

          {/* Customer-visible rooms (read-only) */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'CUSTOMER']} />}>
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:roomId" element={<RoomDetails />} />
            <Route path="/reservations/new" element={<ReservationCreate />} />
            <Route path="/reservations/:reservationId" element={<ReservationDetails />} />
          </Route>

          {/* Staff reservation management */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/reservations" element={<StaffReservations />} />
            <Route path="/admin/reservations" element={<StaffReservations />} />
            <Route path="/manager/reservations" element={<StaffReservations />} />
            <Route path="/receptionist/reservations" element={<StaffReservations />} />
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


          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} />}>
            <Route path="/finance" element={<PlaceholderPage title="Finance" />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
          </Route>
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
