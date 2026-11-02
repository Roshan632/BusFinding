
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import * as L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { io } from "socket.io-client";
import { BusFront, RefreshCw, MapPin, Radio } from "lucide-react";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

type LiveBus = {
  trip_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  start_location: string;
  end_location: string;
  latitude: number | string;
  longitude: number | string;
  speed_kmh: number | string | null;
  recorded_at: string;
};

type LocationUpdate = {
  tripId?: string;
  trip_id?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
  speedKmh?: number | string | null;
  speed_kmh?: number | string | null;
  recordedAt?: string;
  recorded_at?: string;
};

function validCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

const busIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:42px;height:42px;border-radius:15px;
      background:#2563eb;border:3px solid white;
      box-shadow:0 3px 12px rgba(15,23,42,.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:22px;
    ">🚌</div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

type SmoothBusMarkerProps = {
  latitude: number;
  longitude: number;
  bus: LiveBus;
};

function SmoothBusMarker({
  latitude,
  longitude,
  bus,
}: SmoothBusMarkerProps) {
  const [displayPosition, setDisplayPosition] = useState<[number, number]>([
    latitude,
    longitude,
  ]);

  const currentPosition = useRef<[number, number]>([
    latitude,
    longitude,
  ]);

  useEffect(() => {
    let animationFrame = 0;

    const startLatitude = currentPosition.current[0];
    const startLongitude = currentPosition.current[1];
    const startTime = performance.now();
    const duration = 800;

    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);

      // Smooth easing between the previous and new GPS coordinates.
      const eased = progress * progress * (3 - 2 * progress);

      const nextPosition: [number, number] = [
        startLatitude + (latitude - startLatitude) * eased,
        startLongitude + (longitude - startLongitude) * eased,
      ];

      currentPosition.current = nextPosition;
      setDisplayPosition(nextPosition);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [latitude, longitude]);

  return (
    <Marker
      position={displayPosition as LatLngExpression}
      icon={busIcon}
    >
      <Popup>
        <div className="min-w-48 text-sm">
          <p className="font-bold">Bus {bus.bus_number}</p>

          <p className="mt-1">{bus.route_name}</p>

          <p className="mt-1 text-slate-600">
            {bus.start_location} → {bus.end_location}
          </p>

          <p className="mt-2 text-slate-600">
            {bus.speed_kmh == null
              ? "Speed unavailable"
              : `Reported speed: ${Number(bus.speed_kmh).toFixed(1)} km/h`}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            GPS reported:{" "}
            {new Date(bus.recorded_at).toLocaleTimeString()}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function LiveMap() {
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Helps identify new trips that aren't on the map yet.
  const busIdsRef = useRef(new Set<string>());

  const loadBuses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/buses/live`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load live buses.");
      }

      const nextBuses: LiveBus[] = Array.isArray(data.buses)
        ? data.buses
        : [];

      busIdsRef.current = new Set(
        nextBuses.map((bus) => bus.trip_id)
      );

      setBuses(nextBuses);
      setLastUpdate(new Date());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load live buses."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadBuses();
    }, 0);

    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
    });

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    const handleLocation = (update: LocationUpdate) => {
      const tripId = update.tripId ?? update.trip_id;

      const latitude = Number(update.latitude ?? update.lat);
      const longitude = Number(
        update.longitude ?? update.lon ?? update.lng
      );

      // If the event doesn't contain coordinates, refresh from the API.
      if (
        !tripId ||
        !validCoordinates(latitude, longitude)
      ) {
        void loadBuses();
        return;
      }

      // A newly started trip may not have been loaded yet.
      if (!busIdsRef.current.has(tripId)) {
        void loadBuses();
        return;
      }

      setBuses((currentBuses) =>
        currentBuses.map((bus) => {
          if (bus.trip_id !== tripId) return bus;

          return {
            ...bus,
            latitude,
            longitude,
            speed_kmh:
              update.speedKmh ??
              update.speed_kmh ??
              bus.speed_kmh,
            recorded_at:
              update.recordedAt ??
              update.recorded_at ??
              new Date().toISOString(),
          };
        })
      );

      setLastUpdate(new Date());
      setError("");
    };

    const handleTripEnded = () => {
      void loadBuses();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("bus:location", handleLocation);
    socket.on("bus:trip-ended", handleTripEnded);

    // Fallback in case a socket update is missed.
    const interval = window.setInterval(() => {
      void loadBuses();
    }, 15000);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(interval);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("bus:location", handleLocation);
      socket.off("bus:trip-ended", handleTripEnded);
      socket.disconnect();
    };
  }, [loadBuses]);

  const validBuses = buses.filter((bus) =>
    validCoordinates(Number(bus.latitude), Number(bus.longitude))
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-600 p-2.5 text-white">
              <BusFront size={24} />
            </span>

            <span>
              <span className="block font-bold text-slate-900">
                Nepal Transit
              </span>
              <span className="block text-xs text-slate-500">
                Live bus tracking
              </span>
            </span>
          </Link>

          <Link
            to="/routes"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Browse routes
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Passenger map
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Find buses near you
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Bus markers update from the driver's real GPS location.
            </p>
          </div>

          <button
            onClick={() => void loadBuses()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Live buses</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {validBuses.length}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                socketConnected ? "bg-green-500" : "bg-amber-500"
              }`}
            />
            {socketConnected
              ? "Live connection connected"
              : "Connecting to live updates..."}
          </div>

          {lastUpdate && (
            <p className="text-xs text-slate-500">
              Last map update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-[420px] sm:h-[560px]">
            <MapContainer
              center={[27.7172, 85.324]}
              zoom={8}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {validBuses.map((bus) => (
                <SmoothBusMarker
                  key={bus.trip_id}
                  bus={bus}
                  latitude={Number(bus.latitude)}
                  longitude={Number(bus.longitude)}
                />
              ))}
            </MapContainer>
          </div>

          <div className="border-t border-slate-100 p-5">
            {loading ? (
              <p className="text-sm text-slate-500">
                Loading bus positions...
              </p>
            ) : validBuses.length === 0 ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 text-slate-400" size={21} />

                <div>
                  <p className="font-semibold text-slate-800">
                    No live buses available right now
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    A bus appears when its assigned driver starts a trip
                    and shares a recent GPS location.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Radio className="mt-1 text-green-600" size={21} />

                <div>
                  <p className="font-semibold text-slate-800">
                    Tracking {validBuses.length} bus
                    {validBuses.length === 1 ? "" : "es"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Select a bus marker to view its route, speed and
                    latest GPS report. Markers move as new coordinates arrive.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          Locations depend on the driver's GPS permission, device settings
          and internet connection. A displayed position can be delayed.
        </p>
      </div>
    </main>
  );
}
