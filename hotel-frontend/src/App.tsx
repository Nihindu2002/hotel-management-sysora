import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RootRedirect from './routes/RootRedirect';
import DashboardLayout from './layouts/DashboardLayout';
import RoleRoute from './routes/RoleRoute';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import HousekeepingDashboard from './pages/housekeeping/HousekeepingDashboard';
import MaintenanceDashboard from './pages/maintenance/MaintenanceDashboard';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Unauthorized from './pages/Unauthorized';
import PlaceholderPage from './pages/PlaceholderPage';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

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
            <Route path="/users" element={<PlaceholderPage title="User Management" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['MANAGER']} />}>
            <Route path="/manager" element={<ManagerDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['RECEPTIONIST']} />}>
            <Route path="/receptionist" element={<ReceptionistDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['HOUSEKEEPING']} />}>
            <Route path="/housekeeping" element={<HousekeepingDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['MAINTENANCE']} />}>
            <Route path="/maintenance" element={<MaintenanceDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ACCOUNTANT']} />}>
            <Route path="/accountant" element={<AccountantDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/my-reservations" element={<PlaceholderPage title="My Reservations" />} />
            <Route path="/my-invoices" element={<PlaceholderPage title="My Invoices" />} />
            <Route path="/my-payments" element={<PlaceholderPage title="My Payments" />} />
            <Route path="/profile" element={<PlaceholderPage title="My Profile" />} />
          </Route>

          {/* Shared Operations Routes */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'CUSTOMER']} />}>
            <Route path="/rooms" element={<PlaceholderPage title="Rooms" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
            <Route path="/reservations" element={<PlaceholderPage title="Reservations" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']} />}>
            <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
            <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING']} />}>
            <Route path="/housekeeping-tasks" element={<PlaceholderPage title="Housekeeping Tasks" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE']} />}>
            <Route path="/maintenance-tasks" element={<PlaceholderPage title="Maintenance Tasks" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
            <Route path="/staff-management" element={<PlaceholderPage title="Staff Management" />} />
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
