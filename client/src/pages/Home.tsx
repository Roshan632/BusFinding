
import { Link } from "react-router-dom";
import {
  BusFront,
  MapPin,
  Clock3,
  Navigation,
  ShieldCheck,
  ArrowRight,
  Route,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Live bus locations",
    description:
      "See buses reporting their current positions on an interactive map.",
  },
  {
    icon: Clock3,
    title: "Estimated arrival",
    description:
      "Understand when your bus may reach a stop using available location and route data.",
  },
  {
    icon: Route,
    title: "Explore routes",
    description:
      "Find public transport routes, starting points and destinations.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white">
              <BusFront size={25} />
            </div>
            <div>
              <span className="block text-lg font-extrabold tracking-tight">
                Nepal Transit
              </span>
              <span className="block text-xs text-slate-500">
                Smarter journeys across Nepal
              </span>
            </div>
          </Link>

          <Link
  to="/choose-role"
  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
>
  Continue
</Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-blue-600">Features</a>
            <Link to="/routes" className="hover:text-blue-600">Routes</Link>
            <a href="#how-it-works" className="hover:text-blue-600">
              How it works
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.35),_transparent_55%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:py-28 lg:grid-cols-2 lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                A smarter way to travel
              </div>

              <h1 className="mt-7 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Know where your bus is.
                <span className="block text-blue-400">
                  Travel with confidence.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Discover routes, follow buses on a live map, and get estimated
                arrival times when current location data is available. Less
                uncertainty, better journeys.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/routes"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-500"
                >
                  Explore routes <ArrowRight size={18} />
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl border border-white/20 px-5 py-3.5 font-semibold text-white transition hover:bg-white/10"
                >
                  Create account
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-blue-400" />
                  Account-based access
                </span>
                <span className="flex items-center gap-2">
                  <Navigation size={17} className="text-blue-400" />
                  Location-based tracking
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-6">
              <div className="rounded-2xl bg-white p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Your journey</p>
                    <h2 className="mt-1 text-xl font-bold">Bus tracking map</h2>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <MapPin size={24} />
                  </div>
                </div>

                <div className="relative mt-6 flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                  <div className="absolute h-40 w-40 rounded-full border border-blue-200" />
                  <div className="absolute h-28 w-28 rounded-full border border-blue-200" />
                  <div className="absolute h-16 w-16 rounded-full bg-blue-100" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                    <BusFront size={29} />
                  </div>
                  <span className="absolute right-7 top-8 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow">
                    Bus location
                  </span>
                  <span className="absolute bottom-7 left-5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow">
                    Your stop
                  </span>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Preview illustration only. Actual bus positions and arrival
                  estimates will appear when verified GPS and route data are
                  available.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
              Designed for everyday journeys
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Make every trip easier
            </h2>
            <p className="mt-4 leading-7 text-slate-500">
              Useful transport information for passengers and tools for drivers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-700">
                  <Icon size={25} />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">
                How Nepal Transit works
              </h2>
              <p className="mt-4 leading-7 text-slate-500">
                A straightforward experience from finding a route to tracking
                a bus.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                ["01", "Find your route", "Browse the routes available on the platform."],
                ["02", "Follow the bus", "View reported bus positions on the map."],
                ["03", "Plan your arrival", "Use available ETA estimates to plan your journey."],
              ].map(([number, title, description]) => (
                <div key={number} className="rounded-2xl bg-white p-7">
                  <span className="text-sm font-bold text-blue-600">{number}</span>
                  <h3 className="mt-3 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="flex flex-col justify-between gap-6 rounded-3xl bg-blue-700 p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold">Ready for a better journey?</h2>
              <p className="mt-2 text-blue-100">
                Create your account and explore available routes.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Join Nepal Transit <ArrowRight size={18} />
            </Link>
            <Link
  to="/live-map"
  className="rounded-xl border border-slate-200 px-5 py-3.5 font-semibold text-slate-700 hover:bg-slate-50"
>
  Open live map
</Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3 text-white">
              <BusFront size={26} />
              <span className="text-lg font-bold">Nepal Transit</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
              Helping passengers and drivers connect through better transport
              information.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">Explore</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link to="/routes" className="hover:text-white">Bus routes</Link>
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#how-it-works" className="hover:text-white">How it works</a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">Your account</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link to="/login" className="hover:text-white">Sign in</Link>
              <Link to="/register" className="hover:text-white">Register</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">Our commitment</h3>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Location sharing should be permission-based. Arrival times are
              estimates, not guarantees.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Nepal Transit. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
