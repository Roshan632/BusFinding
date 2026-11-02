import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, MapPin, Route as RouteIcon, Save, BusFront } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api";

export default function RoutePlanner() {
  const { token } = useAuth();
  const [routeName, setRouteName] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [arrivalTime, setArrivalTime] = useState("09:30");
  const [stopName, setStopName] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Please sign in again.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/routes/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          routeName,
          startLocation,
          endLocation,
          departureTime,
          arrivalTime,
          stopName,
          stopTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save route schedule.");
      }

      setMessage("Route schedule saved successfully.");
      setRouteName("");
      setStartLocation("");
      setEndLocation("");
      setStopName("");
      setStopTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <BusFront size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Route planner</h1>
              <p className="text-sm text-slate-500">Set route times and stops</p>
            </div>
          </div>

          <Link to="/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100">
            Dashboard
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Route name" icon={<RouteIcon size={18} />}>
              <input value={routeName} onChange={(e) => setRouteName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" placeholder="e.g. Banepa to Kathmandu" required />
            </Field>

            <Field label="Start location" icon={<MapPin size={18} />}>
              <input value={startLocation} onChange={(e) => setStartLocation(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" placeholder="Origin" required />
            </Field>

            <Field label="End location" icon={<MapPin size={18} />}>
              <input value={endLocation} onChange={(e) => setEndLocation(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" placeholder="Destination" required />
            </Field>

            <Field label="Departure time" icon={<Clock3 size={18} />}>
              <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" required />
            </Field>

            <Field label="Arrival time" icon={<Clock3 size={18} />}>
              <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" required />
            </Field>

            <Field label="Stop name (optional)" icon={<MapPin size={18} />}>
              <input value={stopName} onChange={(e) => setStopName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" placeholder="e.g. Ratna Park" />
            </Field>

            <Field label="Stop time (optional)" icon={<Clock3 size={18} />}>
              <input type="time" value={stopTime} onChange={(e) => setStopTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-600" />
            </Field>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save size={18} />
              {loading ? "Saving..." : "Save schedule"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function Field({ label, icon, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
