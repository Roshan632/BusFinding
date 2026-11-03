import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BusFront,
  MapPin,
  Navigation,
  Square,
  Route,
  CheckCircle2,
  XCircle,
  Clock3,
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

type Assignment = {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  start_location: string;
  end_location: string;
departure_time?: string | null;
arrival_time?: string | null;
};

type Trip = { id: string; status: string };

export default function DriverTracking() {
  const navigate = useNavigate();
  const { token, user, signOut } = useAuth();
  const { showToast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState<DriverRequestStatus | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profile, setProfile] = useState({
    busNumber: "",
    registrationNumber: "",
    routeName: "",
    startLocation: "",
    endLocation: "",
    departureTime: "08:00",
    arrivalTime: "09:30",
  });

  const watchId = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignment() {
      try {
        const response = await fetch(`${API_URL}/driver/assignment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load bus assignment.");
        }

        if (!cancelled) setAssignment(data.assignment);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadRequestStatus() {
      if (!token) {
        setRequestStatus(null);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/driver-requests/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const latest = Array.isArray(data.requests) ? data.requests[0] ?? null : null;

        if (!cancelled) {
          setRequestStatus(latest);
        }
      } catch {
        if (!cancelled) {
          setRequestStatus(null);
        }
      }
    }

    if (token) {
      void loadAssignment();
      void loadRequestStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (assignment) {
      setProfile((current) => ({
        busNumber: current.busNumber || assignment.bus_number || "",
        registrationNumber: current.registrationNumber || "",
        routeName: current.routeName || assignment.route_name || "",
        startLocation: current.startLocation || assignment.start_location || "",
        endLocation: current.endLocation || assignment.end_location || "",
        departureTime: current.departureTime || assignment.departure_time || "08:00",
        arrivalTime: current.arrivalTime || assignment.arrival_time || "09:30",
      }));
    }
  }, [assignment]);

  useEffect(() => stopWatching, [stopWatching]);

  function handleLogout() {
    signOut();
    showToast("info", "You have been logged out.");
    navigate("/login", { replace: true });
  }

  async function saveBusProfile(event?: React.FormEvent) {
    event?.preventDefault();
    if (!token) return;

    setSavingProfile(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/driver/bus-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          busNumber: profile.busNumber,
          registrationNumber: profile.registrationNumber,
          routeName: profile.routeName,
          startLocation: profile.startLocation,
          endLocation: profile.endLocation,
          departureTime: profile.departureTime,
          arrivalTime: profile.arrivalTime,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not save bus details.");
      }

      setAssignment(data.assignment);
      setProfile((current) => ({
        ...current,
        busNumber: data.assignment?.bus_number || current.busNumber,
        routeName: data.assignment?.route_name || current.routeName,
        startLocation: data.assignment?.start_location || current.startLocation,
        endLocation: data.assignment?.end_location || current.endLocation,
        departureTime: data.assignment?.departure_time || current.departureTime || "08:00",
        arrivalTime: data.assignment?.arrival_time || current.arrivalTime || "09:30",
      }));
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save bus details.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function startTrip() {
    if (!token) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/driver/trips/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to start trip.");

      setTrip(data.trip);
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start trip.");
    } finally {
      setBusy(false);
    }
  }

  function startSharing() {
    if (!trip || !token) return;

    if (!navigator.geolocation) {
      setError("This browser does not support GPS location.");
      return;
    }

    setError("");
    setMessage("Requesting location permission...");

    watchId.current = navigator.geolocation.watchPosition(
      async (location) => {
        const latitude = location.coords.latitude;
        const longitude = location.coords.longitude;
        const speedKmh =
          location.coords.speed === null
            ? undefined
            : Math.max(0, location.coords.speed * 3.6);

        setPosition({ latitude, longitude });
        setSharing(true);
        setMessage("GPS is active. Sharing your latest position.");

        try {
          const response = await fetch(`${API_URL}/driver/trips/${trip.id}/location`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude, speedKmh }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Location update failed.");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to share location.");
        }
      },
      (locationError) => {
        stopWatching();

        if (locationError.code === locationError.PERMISSION_DENIED) {
          setError("Location permission was denied. Enable it in browser settings to share GPS.");
        } else if (locationError.code === locationError.TIMEOUT) {
          setError("GPS took too long to respond. Try again when you have a clearer signal.");
        } else {
          setError("Your location is currently unavailable.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 20000,
      }
    );
  }

  async function finishTrip() {
    if (!token || !trip) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/driver/trips/${trip.id}/finish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to finish trip.");

      stopWatching();
      setTrip(null);
      setPosition(null);
      setMessage("Trip completed. GPS sharing has stopped.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to finish trip.");
    } finally {
      setBusy(false);
    }
  }

  const approvalStatus = requestStatus?.status ?? "pending";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-3 text-white">
              <BusFront size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Driver dashboard</h1>
              <p className="text-sm text-slate-500">Nepal Transit</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Sign out
          </button>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-green-800 p-7 text-white sm:p-9">
          <p className="text-sm text-emerald-100">Welcome, {user?.name}</p>
          <h2 className="mt-2 text-3xl font-bold">Your bus, your journey</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
            Start your assigned trip, then enable GPS to share your bus location with passengers.
          </p>
        </section>

        {requestStatus && (
          <div
            className={`mt-6 rounded-2xl border p-4 ${
              approvalStatus === "approved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : approvalStatus === "rejected"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {approvalStatus === "approved" ? (
                <CheckCircle2 className="mt-0.5" size={20} />
              ) : approvalStatus === "rejected" ? (
                <XCircle className="mt-0.5" size={20} />
              ) : (
                <Clock3 className="mt-0.5" size={20} />
              )}

              <div>
                <p className="font-semibold">Driver request: {approvalStatus}</p>
                {approvalStatus === "approved" ? (
                  <p className="mt-1 text-sm">
                    Your request has been approved by the admin. Your bus assignment, route plan, and live GPS sharing are now active.
                  </p>
                ) : approvalStatus === "rejected" ? (
                  <p className="mt-1 text-sm">
                    Your request was rejected by the admin. Please contact the admin to review your verification details.
                  </p>
                ) : (
                  <p className="mt-1 text-sm">
                    Your driver request is still under admin review. Once approved, you will be able to start trips and enable live GPS sharing.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Bus assignment</h3>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Checking your assignment...</p>
          ) : !assignment ? (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              No active bus and route have been assigned to your account yet. Add your bus details below and then start a trip.
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <BusFront className="text-emerald-600" size={25} />
                <div>
                  <p className="font-semibold text-slate-900">Bus {assignment.bus_number}</p>
                  <p className="mt-1 text-sm text-slate-500">{assignment.route_name}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <MapPin size={16} />
                {assignment.start_location} → {assignment.end_location}
              </div>
            </div>
          )}

          {approvalStatus === "approved" && (
            <form onSubmit={saveBusProfile} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Bus number
                <input
                  value={profile.busNumber}
                  onChange={(event) => setProfile((current) => ({ ...current, busNumber: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  placeholder="e.g. BA-3-564"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Registration number
                <input
                  value={profile.registrationNumber}
                  onChange={(event) => setProfile((current) => ({ ...current, registrationNumber: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  placeholder="Optional"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Route name
                <input
                  value={profile.routeName}
                  onChange={(event) => setProfile((current) => ({ ...current, routeName: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  placeholder="e.g. Kathmandu to Pokhara"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Start location
                <input
                  value={profile.startLocation}
                  onChange={(event) => setProfile((current) => ({ ...current, startLocation: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  placeholder="From"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                End location
                <input
                  value={profile.endLocation}
                  onChange={(event) => setProfile((current) => ({ ...current, endLocation: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  placeholder="To"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Start time
                <input
                  type="time"
                  value={profile.departureTime}
                  onChange={(event) => setProfile((current) => ({ ...current, departureTime: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                End time
                <input
                  type="time"
                  value={profile.arrivalTime}
                  onChange={(event) => setProfile((current) => ({ ...current, arrivalTime: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile || !token}
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Saving bus details..." : assignment ? "Update bus details" : "Save bus details"}
                </button>
              </div>
            </form>
          )}

          {trip && <p className="mt-4 text-sm text-emerald-700">Active trip: {trip.id}</p>}

          {position && (
            <p className="mt-3 break-words text-xs text-slate-500">
              Latest coordinates: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!trip ? (
              <button
                onClick={() => void startTrip()}
                disabled={!assignment || loading || busy || approvalStatus !== "approved"}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Starting..." : "Start trip"}
              </button>
            ) : (
              <>
                <button
                  onClick={sharing ? stopWatching : startSharing}
                  disabled={busy || approvalStatus !== "approved"}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50 ${
                    sharing ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Navigation size={18} />
                  {sharing ? "Stop live location" : "Enable location access"}
                </button>

                <button
                  onClick={() => void finishTrip()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Square size={16} />
                  Finish trip
                </button>
              </>
            )}
          </div>

          {message && (
            <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <Route size={16} className="mt-0.5 shrink-0" />
          Only share your location while operating an authorized trip. Keep your device secured and never interact with the screen while driving.
        </p>
      </div>
    </main>
  );
}
