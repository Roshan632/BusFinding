
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BusFront,
  MapPin,
  Route,
  ShieldCheck,
  UserRound,
  LogOut,
  ArrowRight,
  FileCheck2,
  CircleCheckBig,
  CircleX,
  Clock3,
  Search,
  Navigation,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";

const API_URL = "http://localhost:5000/api";

type DriverRequestStatus = {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string | null;
  review_note?: string | null;
};

type PassengerRouteResult = {
  id: string;
  route_name: string;
  start_location: string;
  end_location: string;
  departure_time: string;
  arrival_time: string;
  stop_name: string | null;
  stop_time: string | null;
  driver_name: string | null;
  bus_number: string | null;
  trip_id?: string | null;
  trip_status?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  speed_kmh?: number | string | null;
  recorded_at?: string | null;
};

const dashboardContent = {
  passenger: {
    title: "Find your bus",
    description:
      "Explore public transport routes and get ready to track buses in real time.",
    icon: BusFront,
    items: [
      {
        title: "Find buses",
        description: "Discover buses serving your area.",
        icon: MapPin,
      },
      {
        title: "Explore routes",
        description: "See available routes and stops.",
        icon: Route,
      },
    ],
  },
  driver: {
    title: "Driver dashboard",
    description:
      "Your workspace for managing trips and sharing bus locations.",
    icon: BusFront,
    items: [
      {
        title: "My trips",
        description: "Your assigned trips will appear here.",
        icon: Route,
      },
      {
        title: "Location sharing",
        description: "GPS tracking will be available when a trip is active.",
        icon: MapPin,
      },
    ],
  },
  admin: {
    title: "Administration",
    description:
      "Manage the Nepal Transit platform and monitor its operations.",
    icon: ShieldCheck,
    items: [
      {
        title: "User management",
        description: "Review passenger and driver accounts.",
        icon: UserRound,
      },
      {
        title: "Transport management",
        description: "Manage buses, routes and trips.",
        icon: BusFront,
      },
    ],
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, signOut, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [driverRequest, setDriverRequest] = useState<DriverRequestStatus | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [routeTime, setRouteTime] = useState("");
  const [routeResults, setRouteResults] = useState<PassengerRouteResult[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    if (!user || !token) return;

    const intervalId = window.setInterval(() => {
      void refreshUser();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [user, token, refreshUser]);

  useEffect(() => {
    if (!user || !token || user.role !== "passenger") {
      setDriverRequest(null);
      return;
    }

    let active = true;
    setRequestLoading(true);

    async function loadDriverRequest() {
      try {
        const response = await fetch(`${API_URL}/driver-requests/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const latest = Array.isArray(data.requests) ? data.requests[0] ?? null : null;

        if (active) {
          setDriverRequest(latest);
        }
      } catch {
        if (active) {
          setDriverRequest(null);
        }
      } finally {
        if (active) {
          setRequestLoading(false);
        }
      }
    }

    void loadDriverRequest();

    return () => {
      active = false;
    };
  }, [user, token]);

  useEffect(() => {
    if (user?.role !== "passenger") {
      setRouteResults([]);
      return;
    }

    let active = true;

    async function loadDefaultRoutes() {
      try {
        setRouteLoading(true);
        const response = await fetch(`${API_URL}/routes/search`);
        const data = await response.json();
        if (!active) return;

        setRouteResults(Array.isArray(data.routes) ? data.routes : []);
        setRouteError("");
      } catch {
        if (active) {
          setRouteError("Unable to load route search results.");
          setRouteResults([]);
        }
      } finally {
        if (active) setRouteLoading(false);
      }
    }

    void loadDefaultRoutes();

    return () => {
      active = false;
    };
  }, [user?.role]);

  async function handleRouteSearch(event: React.FormEvent) {
    event.preventDefault();
    if (user?.role !== "passenger") return;

    setRouteLoading(true);
    setRouteError("");

    try {
      const params = new URLSearchParams();
      if (routeFrom) params.set("from", routeFrom);
      if (routeTo) params.set("to", routeTo);
      if (routeTime) params.set("time", routeTime);

      const response = await fetch(`${API_URL}/passenger/route-status?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No matching routes were found.");
      }

      setRouteResults(Array.isArray(data.routeStatus) ? data.routeStatus : []);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Route search failed.");
      setRouteResults([]);
    } finally {
      setRouteLoading(false);
    }
  }

  if (!user) return null;

  const content = dashboardContent[user.role];
  const RoleIcon = content.icon;

  function handleLogout() {
    signOut();
    showToast("info", "You have been logged out.");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2 text-white">
              <BusFront size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Nepal Transit
              </h1>
              <p className="text-xs text-slate-500">
                Public transport tracking
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-green-800 p-7 text-white shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="mb-3 text-sm font-medium text-emerald-100">
                Welcome back
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Hello, {user.name}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100 sm:text-base">
                {content.description}
              </p>
              <span className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold capitalize">
                {user.role} account
              </span>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-2xl bg-white/10 sm:self-center">
              <RoleIcon size={40} />
            </div>
          </div>
        </section>

        {user.role === "passenger" && (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  {driverRequest?.status === "approved" ? (
                    <CircleCheckBig size={22} />
                  ) : driverRequest?.status === "rejected" ? (
                    <CircleX size={22} />
                  ) : (
                    <Clock3 size={22} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Driver access status</h3>
                  <p className="text-sm text-slate-500">
                    {requestLoading
                      ? "Checking your request..."
                      : driverRequest
                        ? "Your latest driver request result"
                        : "You have not submitted a driver request yet."}
                  </p>
                </div>
              </div>
            </div>

            {!requestLoading && driverRequest ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      driverRequest.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : driverRequest.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {driverRequest.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    Requested {new Date(driverRequest.requested_at).toLocaleString()}
                  </span>
                </div>

                {driverRequest.review_note ? (
                  <p className="mt-3 text-sm text-slate-600">Admin note: {driverRequest.review_note}</p>
                ) : null}

                {driverRequest.status === "approved" ? (
                  <p className="mt-3 text-sm text-emerald-700">
                    Your driver request has been approved. Please sign out and sign in again to access the driver dashboard.
                  </p>
                ) : driverRequest.status === "rejected" ? (
                  <p className="mt-3 text-sm text-red-700">
                    Your driver request was rejected. Please update your verification details and submit again.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-amber-700">
                    Your driver verification is still pending admin review.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        )}

        {user.role === "passenger" && (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Search buses and routes</h3>
                <p className="text-sm text-slate-500">Find matching routes, times and live bus status.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Navigation size={14} />
                Live tracking
              </div>
            </div>

            <form onSubmit={handleRouteSearch} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="block text-sm font-medium text-slate-700">
                From
                <input
                  value={routeFrom}
                  onChange={(event) => setRouteFrom(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-600"
                  placeholder="e.g. Kathmandu"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                To
                <input
                  value={routeTo}
                  onChange={(event) => setRouteTo(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-600"
                  placeholder="e.g. Pokhara"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Time
                <input
                  type="time"
                  value={routeTime}
                  onChange={(event) => setRouteTime(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-600"
                />
              </label>

              <button
                type="submit"
                disabled={routeLoading}
                className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Search size={18} />
                {routeLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {routeError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{routeError}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/live-map"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
              >
                <MapPin size={18} />
                Open live map
              </Link>
              <Link
                to="/routes"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <BusFront size={18} />
                View route list
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {routeResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No matching buses or routes found. Try a different route or time.
                </div>
              ) : (
                routeResults.map((route) => (
                  <article key={route.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          {route.route_name || "Route"}
                        </div>
                        <h4 className="mt-2 text-lg font-bold text-slate-900">
                          {route.start_location} → {route.end_location}
                        </h4>
                      </div>

                      <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                        <div className="font-semibold text-slate-900">{route.bus_number || "Bus pending"}</div>
                        <div className="mt-1">Driver: {route.driver_name || "Unassigned"}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Departure</p>
                        <p className="mt-2 font-semibold text-slate-900">{route.departure_time || "—"}</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Arrival</p>
                        <p className="mt-2 font-semibold text-slate-900">{route.arrival_time || "—"}</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Live status</p>
                        <p className="mt-2 font-semibold text-emerald-700">
                          {route.trip_status === "active" && route.latitude && route.longitude
                            ? "Bus moving"
                            : route.trip_status === "active"
                              ? "Tracking started"
                              : "Waiting for GPS"}
                        </p>
                      </div>
                    </div>

                    {route.stop_name && (
                      <p className="mt-4 text-sm text-slate-600">
                        Main stop: {route.stop_name} at {route.stop_time || "—"}
                      </p>
                    )}

                    {route.trip_status === "active" && route.latitude && route.longitude && (
                      <p className="mt-3 text-sm text-slate-600">
                        Latest GPS: {Number(route.latitude).toFixed(4)}, {Number(route.longitude).toFixed(4)}
                        {route.speed_kmh !== null && route.speed_kmh !== undefined ? ` · ${Number(route.speed_kmh).toFixed(1)} km/h` : ""}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-5">
            <h3 className="text-xl font-bold">{content.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose an area to get started.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {content.items.map((item) => {
              const ItemIcon = item.icon;

              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                      <ItemIcon size={24} />
                    </div>
                    <ArrowRight
                      size={20}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                    />
                  </div>

                  <h4 className="mt-5 font-semibold">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {user.role === "admin" ? (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                <ShieldCheck size={18} />
                Open admin board
              </Link>
            ) : user.role === "driver" ? (
              <>
                <Link
                  to="/route-planner"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  <Route size={18} />
                  Create route schedule
                </Link>
                <Link
                  to="/verification"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  <FileCheck2 size={18} />
                  Upload driver documents
                </Link>
              </>
            ) : (
              <Link
                to="/verification"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                <FileCheck2 size={18} />
                Upload NID documents
              </Link>
            )}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-slate-400">
          Nepal Transit · Connecting passengers, drivers and routes
        </p>
      </main>
    </div>
  );
}
