import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  getAllUsers,
  updateUserRole,
  registerUserByAdmin,
} from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import {
  registerRules,
  type RegisterFormValues,
} from "../../schemas/authSchemas";
import type { UserProfile, UserRole } from "../../types/user";

type TabKey = "staff" | "customers" | "register";

const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "ACCOUNTANT",
  "STAFF",
  "CUSTOMER",
];

const STAFF_ROLES: UserRole[] = [
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "ACCOUNTANT",
  "STAFF",
];

const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-800 border-red-200",
  MANAGER: "bg-purple-100 text-purple-800 border-purple-200",
  RECEPTIONIST: "bg-blue-100 text-blue-800 border-blue-200",
  HOUSEKEEPING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  MAINTENANCE: "bg-orange-100 text-orange-800 border-orange-200",
  ACCOUNTANT: "bg-teal-100 text-teal-800 border-teal-200",
  STAFF: "bg-gray-100 text-gray-800 border-gray-200",
  CUSTOMER: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

interface RoleModalState {
  user: UserProfile;
  newRole: UserRole;
}

interface AdminRegisterFormValues extends RegisterFormValues {
  role: UserRole;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function AdminUserList() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab management: read from URL or default to "staff"
  const initialTab = (searchParams.get("tab") as TabKey) || "staff";
  const [activeTab, setActiveTab] = useState<TabKey>(
    ["staff", "customers", "register"].includes(initialTab)
      ? initialTab
      : "staff"
  );

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters for Staff tab
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffFilterRole, setStaffFilterRole] = useState<UserRole | "ALL">("ALL");

  // Filters for Customers tab
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Role change modal state
  const [roleModal, setRoleModal] = useState<RoleModalState | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Register User form
  const [registerApiError, setRegisterApiError] = useState("");
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState("");

  const {
    register: registerField,
    handleSubmit: handleRegisterSubmit,
    getValues: getRegisterValues,
    reset: resetRegisterForm,
    formState: { errors: registerErrors, isSubmitting: isRegisterSubmitting },
  } = useForm<AdminRegisterFormValues>({
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "STAFF",
      password: "",
      confirmPassword: "",
    },
  });

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSuccessMsg(null);
    setRegisterSuccessMsg("");
    setRegisterApiError("");
  };

  const fetchUsers = () => {
    let ignore = false;
    getAllUsers()
      .then((data) => {
        if (!ignore) setUsers(data);
      })
      .catch(() => {
        if (!ignore) setError("Failed to load users. Please refresh.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  };

  useEffect(() => {
    return fetchUsers();
  }, []);

  // Staff members (all roles except CUSTOMER)
  const staffMembers = useMemo(() => {
    return users.filter((u) => u.role !== "CUSTOMER");
  }, [users]);

  // Customers (only role === 'CUSTOMER')
  const customerMembers = useMemo(() => {
    return users.filter((u) => u.role === "CUSTOMER");
  }, [users]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffMembers.filter((u) => {
      if (staffFilterRole !== "ALL" && u.role !== staffFilterRole) return false;
      if (staffSearchQuery.trim()) {
        const q = staffSearchQuery.toLowerCase();
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        return (
          name.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone && u.phone.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [staffMembers, staffFilterRole, staffSearchQuery]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customerMembers.filter((u) => {
      if (customerSearchQuery.trim()) {
        const q = customerSearchQuery.toLowerCase();
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        return (
          name.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone && u.phone.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customerMembers, customerSearchQuery]);

  // Role change modal triggers
  const openRoleModal = (targetUser: UserProfile, newRole: UserRole) => {
    setRoleError(null);
    setRoleModal({ user: targetUser, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setChangingRole(true);
    setRoleError(null);
    setSuccessMsg(null);
    try {
      const updated = await updateUserRole(
        roleModal.user.uid,
        roleModal.newRole
      );
      setUsers((prev) =>
        prev.map((u) => (u.uid === updated.uid ? updated : u))
      );
      setSuccessMsg(
        `Role updated: ${roleModal.user.firstName || roleModal.user.email} is now ${roleModal.newRole}.`
      );
      setRoleModal(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update role. Please try again.";
      setRoleError(msg);
    } finally {
      setChangingRole(false);
    }
  };

  // Register User Form Submit
  const onRegisterSubmit = async (data: AdminRegisterFormValues) => {
    setRegisterApiError("");
    setRegisterSuccessMsg("");

    try {
      const newUser = await registerUserByAdmin({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
        role: data.role,
      });

      // Update users state
      setUsers((prev) => [newUser, ...prev]);

      setRegisterSuccessMsg(
        `User ${newUser.firstName} ${newUser.lastName} (${newUser.email}) registered successfully as ${newUser.role}!`
      );
      resetRegisterForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "STAFF",
        password: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Registration failed. Please check the information and try again.";
      setRegisterApiError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage hotel staff members, customer accounts, change roles, and register new users.
        </p>
      </div>

      {/* Global Success / Error Message */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="border-b border-gray-200 bg-white px-4 pt-3 rounded-t-xl border">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {/* Staff Tab */}
          <button
            type="button"
            onClick={() => switchTab("staff")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "staff"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Staff
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "staff"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {staffMembers.length}
            </span>
          </button>

          {/* Customers Tab */}
          <button
            type="button"
            onClick={() => switchTab("customers")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "customers"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Customers
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "customers"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {customerMembers.length}
            </span>
          </button>

          {/* Register User Tab */}
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "register"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.375 21c-2.33 0-4.512-.645-6.374-1.765z" />
            </svg>
            Register User
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600">
              New
            </span>
          </button>
        </nav>
      </div>

      {/* ── TAB 1: STAFF ──────────────────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          {/* Filters for Staff */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Search Staff
                </label>
                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Name, email, or phone…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Staff Role
                </label>
                <select
                  value={staffFilterRole}
                  onChange={(e) =>
                    setStaffFilterRole(e.target.value as UserRole | "ALL")
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Staff Roles</option>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setStaffSearchQuery("");
                    setStaffFilterRole("ALL");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <span className="ml-3 text-sm text-gray-500">Loading staff members…</span>
            </div>
          ) : (
            <UserTable
              users={filteredStaff}
              currentUser={currentUser}
              emptyMessage="No staff members match your criteria."
              onOpenRoleModal={openRoleModal}
            />
          )}
        </div>
      )}

      {/* ── TAB 2: CUSTOMERS ─────────────────────────────────────────────────── */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          {/* Filters for Customers */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Search Customers
                </label>
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Name, email, or phone…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setCustomerSearchQuery("")}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <span className="ml-3 text-sm text-gray-500">Loading customers…</span>
            </div>
          ) : (
            <UserTable
              users={filteredCustomers}
              currentUser={currentUser}
              emptyMessage="No customers found."
              onOpenRoleModal={openRoleModal}
            />
          )}
        </div>
      )}

      {/* ── TAB 3: REGISTER USER BY ADMIN ───────────────────────────────────── */}
      {activeTab === "register" && (
        <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Register User as Administrator
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Create a new user account with login credentials and assign their hotel role.
            </p>
          </div>

          {registerSuccessMsg && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">
                    {registerSuccessMsg}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchTab("staff")}
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                    >
                      View in Staff List
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab("customers")}
                      className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      View in Customers
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {registerApiError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {registerApiError}
            </div>
          )}

          <form
            onSubmit={handleRegisterSubmit(onRegisterSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* First Name & Last Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                    registerErrors.firstName
                      ? "border-red-400 focus:ring-red-200"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                  }`}
                  {...registerField("firstName", registerRules.firstName)}
                />
                {registerErrors.firstName && (
                  <p className="mt-1 text-xs text-red-500">
                    {registerErrors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Silva"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                    registerErrors.lastName
                      ? "border-red-400 focus:ring-red-200"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                  }`}
                  {...registerField("lastName", registerRules.lastName)}
                />
                {registerErrors.lastName && (
                  <p className="mt-1 text-xs text-red-500">
                    {registerErrors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  registerErrors.email
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                }`}
                {...registerField("email", registerRules.email)}
              />
              {registerErrors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {registerErrors.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 0771234567 or +94771234567"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  registerErrors.phone
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                }`}
                {...registerField("phone", registerRules.phone)}
              />
              {registerErrors.phone && (
                <p className="mt-1 text-xs text-red-500">
                  {registerErrors.phone.message}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                System Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                {...registerField("role", { required: "Role is required" })}
              >
                <optgroup label="Staff Roles">
                  <option value="STAFF">STAFF (General Staff)</option>
                  <option value="RECEPTIONIST">RECEPTIONIST (Front Desk)</option>
                  <option value="HOUSEKEEPING">HOUSEKEEPING (Cleaning)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Repairs)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (Finance)</option>
                  <option value="MANAGER">MANAGER (Hotel Manager)</option>
                  <option value="ADMIN">ADMIN (Full Administrator)</option>
                </optgroup>
                <optgroup label="Customer Role">
                  <option value="CUSTOMER">CUSTOMER (Hotel Guest)</option>
                </optgroup>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The role controls access permissions and visible navigation tabs.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  registerErrors.password
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                }`}
                {...registerField("password", registerRules.password)}
              />
              {registerErrors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {registerErrors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  registerErrors.confirmPassword
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                }`}
                {...registerField(
                  "confirmPassword",
                  registerRules.confirmPassword(getRegisterValues)
                )}
              />
              {registerErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">
                  {registerErrors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isRegisterSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {isRegisterSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Registering User…
                  </>
                ) : (
                  "Register User"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ROLE CHANGE CONFIRMATION MODAL ───────────────────────────────────── */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Confirm Role Change
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Change{" "}
                  <strong>
                    {roleModal.user.firstName ?? roleModal.user.email}
                  </strong>
                  's role from{" "}
                  <span
                    className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${
                      ROLE_COLOR[roleModal.user.role]
                    }`}
                  >
                    {roleModal.user.role}
                  </span>{" "}
                  to{" "}
                  <span
                    className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${
                      ROLE_COLOR[roleModal.newRole]
                    }`}
                  >
                    {roleModal.newRole}
                  </span>
                  ?
                </p>

                {roleModal.user.role === "ADMIN" && (
                  <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                    ⚠️ You are downgrading an ADMIN account. This will remove their admin access.
                  </p>
                )}
                {roleModal.newRole === "ADMIN" && (
                  <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    ⚠️ You are granting full ADMIN privileges to this user.
                  </p>
                )}
                {roleModal.user.role === "CUSTOMER" && (
                  <p className="mt-2 rounded bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                    ℹ️ This user will now appear in the <strong>Staff</strong> tab.
                  </p>
                )}
                {roleModal.newRole === "CUSTOMER" && (
                  <p className="mt-2 rounded bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                    ℹ️ This user will now appear in the <strong>Customers</strong> tab.
                  </p>
                )}
              </div>
            </div>

            {roleError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {roleError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRoleModal(null);
                  setRoleError(null);
                }}
                disabled={changingRole}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                disabled={changingRole}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {changingRole ? "Saving…" : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── REUSABLE USER TABLE COMPONENT ─────────────────────────────────────────────
interface UserTableProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  emptyMessage: string;
  onOpenRoleModal: (user: UserProfile, newRole: UserRole) => void;
}

function UserTable({
  users,
  currentUser,
  emptyMessage,
  onOpenRoleModal,
}: UserTableProps) {
  const isSelf = (u: UserProfile) => u.uid === currentUser?.uid;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
        {users.length} user{users.length !== 1 ? "s" : ""}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["User", "Email", "Phone", "Role", "Status", "Created", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.uid}
                  className={isSelf(u) ? "bg-indigo-50/40" : "hover:bg-gray-50"}
                >
                  {/* Name & Avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {u.firstName && u.lastName
                            ? `${u.firstName} ${u.lastName}`
                            : u.firstName || "—"}
                          {isSelf(u) && (
                            <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              You
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-xs text-gray-400">
                          {u.uid.slice(0, 12)}…
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.phone || "—"}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {u.enabled === false ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {isSelf(u) ? (
                      <span className="text-xs text-gray-400 italic">
                        Cannot change own role
                      </span>
                    ) : (
                      <RoleChangeDropdown
                        user={u}
                        onSelect={(newRole) => onOpenRoleModal(u, newRole)}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ROLE CHANGE DROPDOWN ──────────────────────────────────────────────────────
interface RoleChangeDropdownProps {
  user: UserProfile;
  onSelect: (role: UserRole) => void;
}

function RoleChangeDropdown({ user, onSelect }: RoleChangeDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
      >
        Change Role
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Select Role
            </div>
            {ALL_ROLES.filter((r) => r !== user.role).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect(role);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    role === "ADMIN"
                      ? "bg-red-500"
                      : role === "MANAGER"
                      ? "bg-purple-500"
                      : role === "CUSTOMER"
                      ? "bg-emerald-500"
                      : role === "ACCOUNTANT"
                      ? "bg-teal-500"
                      : "bg-gray-400"
                  }`}
                />
                {role}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
