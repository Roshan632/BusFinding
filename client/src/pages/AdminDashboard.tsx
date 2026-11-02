import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
  const { user, token } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [driverRequests, setDriverRequests] = useState<DriverRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReviewRequest(requestId: string, decision: "approved" | "rejected") {
    if (!token) return;

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to review driver request.");
      }

      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review driver request.");
    } finally {
      setReviewingId(null);
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">You do not have admin access.</p>
          <Link to="/dashboard" className="mt-4 inline-block font-semibold text-blue-600">
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
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
              <p className="text-sm text-slate-500">Manage all platform users</p>
            </div>
          </div>

          <Link to="/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100">
            Back to dashboard
          </Link>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p>{error}</p>
          </div>
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
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
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
                        <button
                          type="button"
                          onClick={() => void handleDelete(account.id)}
                          disabled={deletingId === account.id || account.id === user.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                          {deletingId === account.id ? "Deleting..." : "Delete"}
                        </button>
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
