import ManagementDashboard from '../dashboard/ManagementDashboard';

/**
 * ADMIN and MANAGER share the same management dashboard; the two routes exist
 * so each role has its own landing path after login.
 */
export default function ManagerDashboard() {
  return <ManagementDashboard />;
}
