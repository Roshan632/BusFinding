
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BusFront, MapPin, Navigation, Square, Route } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api";

type Assignment = {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  start_location: string;
  end_location: string;
};

type Trip = { id: string; status: string };

export default function DriverTracking() {
  const { token, user, signOut } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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

    if (token) void loadAssignment();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => stopWatching, [stopWatching]);

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
          const response = await fetch(
            `${API_URL}/driver/trips/${trip.id}/location`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ latitude, longitude, speedKmh }),
            }
          );

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Location update failed.");
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Unable to share location."
          );
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
      const response = await fetch(
        `${API_URL}/driver/trips/${trip.id}/finish`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <BusFront size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Driver dashboard</h1>
              <p className="text-sm text-slate-500">Nepal Transit</p>
            </div>
          </Link>

          <button
            onClick={signOut}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Sign out
          </button>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-7 text-white sm:p-9">
          <p className="text-sm text-blue-100">Welcome, {user?.name}</p>
          <h2 className="mt-2 text-3xl font-bold">Your bus, your journey</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
            Start your assigned trip, then enable GPS to share your bus location
            with passengers.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Bus assignment</h3>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Checking your assignment...</p>
          ) : !assignment ? (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              No active bus and route have been assigned to your account yet.
              Contact your administrator before starting a trip.
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <BusFront className="text-blue-600" size={25} />
                <div>
                  <p className="font-semibold text-slate-900">
                    Bus {assignment.bus_number}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.route_name}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <MapPin size={16} />
                {assignment.start_location} → {assignment.end_location}
              </div>
            </div>
          )}

          {trip && (
            <p className="mt-4 text-sm text-blue-700">
              Active trip: {trip.id}
            </p>
          )}

          {position && (
            <p className="mt-3 break-words text-xs text-slate-500">
              Latest coordinates: {position.latitude.toFixed(6)},{" "}
              {position.longitude.toFixed(6)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!trip ? (
              <button
                onClick={() => void startTrip()}
                disabled={!assignment || loading || busy}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Starting..." : "Start trip"}
              </button>
            ) : (
              <>
                <button
                  onClick={sharing ? stopWatching : startSharing}
                  disabled={busy}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50 ${
                    sharing
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-blue-600 hover:bg-blue-700"
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
            <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
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
          Only share your location while operating an authorized trip. Keep
          your device secured and never interact with the screen while driving.
        </p>
      </div>
    </main>
  );
}
