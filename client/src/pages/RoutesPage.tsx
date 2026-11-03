import { useState } from "react";
import { BusFront, MapPin, Clock3, ArrowRight, Search } from "lucide-react";

const API_URL = "http://localhost:5000/api";

type RouteMatch = {
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
};

export default function RoutesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [time, setTime] = useState("");
  const [routes, setRoutes] = useState<RouteMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (time) params.set("time", time);

      const response = await fetch(`${API_URL}/routes/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Search failed.");
      }

      setRoutes(Array.isArray(data.routes) ? data.routes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-3 text-white">
              <BusFront size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Find a bus</h1>
              <p className="text-sm text-slate-500">Search by start, end and departure time</p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Field icon={<MapPin size={18} />}>
              <input value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" placeholder="From" />
            </Field>

            <Field icon={<MapPin size={18} />}>
              <input value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" placeholder="To" />
            </Field>

            <Field icon={<Clock3 size={18} />}>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" />
            </Field>

            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              <Search size={18} />
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <section className="mt-6 grid gap-5">
          {routes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No matching buses found. Try a different location or time.
            </div>
          ) : (
            routes.map((route) => (
              <article key={route.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {route.route_name}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {route.start_location} <ArrowRight className="mx-2 inline-block" size={18} /> {route.end_location}
                    </h2>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">{route.driver_name || "Driver"}</div>
                    <div className="mt-1">Bus: {route.bus_number || "Pending assignment"}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <InfoCard label="Departure" value={route.departure_time} />
                  <InfoCard label="Arrival" value={route.arrival_time} />
                  <InfoCard label="Stop" value={route.stop_name ? `${route.stop_name} @ ${route.stop_time || "—"}` : "No stop set"} />
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

type FieldProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
};

function Field({ icon, children }: FieldProps) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
      {icon}
      {children}
    </label>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
