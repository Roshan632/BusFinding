import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Check, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";

const API_URL = "http://localhost:5000/api";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "passenger" | "driver" | "admin";
  status: "active" | "suspended";
  phone?: string | null;
  created_at?: string;
};

type DriverRequestRow = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string | null;
  review_note?: string | null;
  name: string;
  email: string;
  user_status?: string;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [driverRequests, setDriverRequests] = useState<DriverRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"passenger" | "driver" | "admin">("passenger");
  const [editingStatus, setEditingStatus] = useState<"active" | "suspended">("active");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!token) return;

    try {
      const [usersResponse, requestsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/driver-requests?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const usersData = await usersResponse.json();
      const requestsData = await requestsResponse.json();

      if (!usersResponse.ok) {
        throw new Error(usersData.message || "Unable to load users.");
      }

      if (!requestsResponse.ok) {
        throw new Error(requestsData.message || "Unable to load driver requests.");
      }

      setUsers(usersData.users || []);
      setDriverRequests(requestsData.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [token]);

  const selectedUser = users.find((account) => account.id === selectedUserId) ?? null;

  function handleLogout() {
    signOut();
    showToast("info", "You have been logged out.");
    navigate("/login", { replace: true });
  }

  function handleViewUser(userId: string) {
    setSelectedUserId((current) => (current === userId ? null : userId));
    setEditingUserId(null);
  }

  function beginEditUser(user: UserRow) {
    setSelectedUserId(user.id);
    setEditingUserId(user.id);
    setEditingRole(user.role);
    setEditingStatus(user.status);
  }

  async function saveUserEdit(userId: string) {
    if (!token) return;

    setSavingUserId(userId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: editingRole,
          status: editingStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update user.");
      }

      setUsers((current) =>
        current.map((account) =>
          account.id === userId
            ? { ...account, role: data.user.role, status: data.user.status }
            : account
        )
      );

      setEditingUserId(null);
      setSelectedUserId(userId);
      showToast("success", "User role and status were updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update user.";
      setError(message);
      showToast("error", message);
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!token) return;

    const confirmed = window.confirm("Delete this user permanently? This action cannot be undone.");
    if (!confirmed) return;

    setDeletingId(userId);

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete user.");
      }

      setUsers((current) => current.filter((item) => item.id !== userId));
      setDriverRequests((current) => current.filter((item) => item.user_id !== userId));
      showToast("success", "User deleted successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete user.";
      setError(message);
      showToast("error", message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReviewRequest(requestId: string, decision: "approved" | "rejected") {
    if (!token) return;
    if (reviewingId && reviewingId !== requestId) {
      return;
    }
    if (reviewingId === requestId) {
      return;
    }

    const note = window.prompt(
      decision === "approved"
        ? "Add an approval note (optional):"
        : "Add a rejection note (optional):",
      ""
    );

    setReviewingId(requestId);

    try {
      const response = await fetch(`${API_URL}/admin/driver-requests/${requestId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          reviewNote: note?.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          await loadDashboard();
          showToast("info", "This driver request was already reviewed.");
          return;
        }

        throw new Error(data.message || "Unable to review driver request.");
      }

      await loadDashboard();
      showToast(
        "success",
        decision === "approved"
          ? "Driver request approved successfully."
          : "Driver request rejected successfully."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to review driver request.";
      setError(message);
      showToast("error", message);
    } finally {
      setReviewingId(null);
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">You do not have admin access.</p>
          <Link to="/dashboard" className="mt-4 inline-block font-semibold text-emerald-600">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-3 text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
              <p className="text-sm text-slate-500">Manage all platform users</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.href = "/admin"}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Admin dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p>{error}</p>
          </div>
        )}

        {selectedUser && (
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Selected user</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{selectedUser.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {editingUserId === selectedUser.id ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Role
                  <select
                    value={editingRole}
                    onChange={(event) => setEditingRole(event.target.value as "passenger" | "driver" | "admin")}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600"
                  >
                    <option value="passenger">Passenger</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={editingStatus}
                    onChange={(event) => setEditingStatus(event.target.value as "active" | "suspended")}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <div className="md:col-span-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void saveUserEdit(selectedUser.id)}
                    disabled={savingUserId === selectedUser.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingUserId === selectedUser.id ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Email</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedUser.email}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Role</p>
                  <p className="mt-1 font-medium capitalize text-slate-900">{selectedUser.role}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
                  <p className="mt-1 font-medium capitalize text-slate-900">{selectedUser.status}</p>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <UserRound size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Driver requests</p>
                <p className="text-sm text-slate-500">{driverRequests.length} pending approvals</p>
              </div>
            </div>
          </div>

          {driverRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No driver requests are waiting for review.</p>
          ) : (
            <div className="space-y-3">
              {driverRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{request.name}</p>
                      <p className="text-sm text-slate-600">{request.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleReviewRequest(request.id, "approved")}
                        disabled={reviewingId === request.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Check size={16} />
                        {reviewingId === request.id ? "Reviewing..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReviewRequest(request.id, "rejected")}
                        disabled={reviewingId === request.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                    Requested {new Date(request.requested_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <UserRound size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">All users</p>
                <p className="text-sm text-slate-500">{users.length} total accounts</p>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Role</th>
                    <th className="pb-3 pr-4 font-medium">Phone</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((account) => (
                    <tr key={account.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4 font-medium text-slate-900">{account.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{account.email}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                          {account.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{account.phone || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewUser(account.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => beginEditUser(account)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(account.id)}
                            disabled={deletingId === account.id || account.id === user.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                            {deletingId === account.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
