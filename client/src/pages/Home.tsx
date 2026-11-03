import { Link } from "react-router-dom";
import {
  BusFront,
  MapPin,
  Clock3,
  Navigation,
  ShieldCheck,
  ArrowRight,
  Route,
  CheckCircle2,
  Menu,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Live bus locations",
    description:
      "See real-time bus positions and track the route as it moves through the city.",
  },
  {
    icon: Clock3,
    title: "Arrival estimates",
    description:
      "Stay informed on expected timing so you can plan your trip without guessing.",
  },
  {
    icon: Route,
    title: "Smart route planning",
    description:
      "Browse route options, starting points, and destinations with a clean, clear view.",
  },
];

const stats = [
  { label: "Routes covered", value: "120+" },
  { label: "Live bus updates", value: "24/7" },
  { label: "Trust & safety", value: "Verified" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-600 p-2.5 text-white shadow-md shadow-emerald-200">
              <BusFront size={25} />
            </div>
            <div>
              <span className="block text-lg font-extrabold tracking-tight text-slate-900">
                Nepal <span className="text-emerald-600">Transit</span>
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Smarter journeys
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-emerald-700">Features</a>
            <Link to="/routes" className="transition hover:text-emerald-700">Routes</Link>
            <a href="#how-it-works" className="transition hover:text-emerald-700">How it works</a>
            <a href="#about" className="transition hover:text-emerald-700">About</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white p-2.5 text-emerald-700 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/choose-role"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700"
            >
              Continue
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-green-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-emerald-50 backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-200" />
                Public transport made clearer
              </div>

              <h1 className="mt-7 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Ride smarter.
                <span className="mt-2 block text-emerald-100">
                  Travel with confidence.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-emerald-50/90 sm:text-lg">
                Discover routes, follow live bus movement, and reach your destination with fewer surprises.
                Built for passengers and drivers across Nepal.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/routes"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 font-semibold text-emerald-700 shadow-md transition hover:bg-emerald-50"
                >
                  Explore routes <ArrowRight size={18} />
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl border border-white/25 bg-white/5 px-5 py-3.5 font-semibold text-white transition hover:bg-white/10"
                >
                  Create account
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap gap-6 text-sm text-emerald-50/90">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-emerald-100" />
                  Secure access
                </span>
                <span className="flex items-center gap-2">
                  <Navigation size={17} className="text-emerald-100" />
                  Live tracking
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
                <div className="rounded-[24px] bg-white p-5 shadow-xl sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Live status</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">Route overview</h2>
                    </div>
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                      <MapPin size={24} />
                    </div>
                  </div>

                  <div className="relative mt-6 h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-green-50 ring-1 ring-slate-100">
                    <div className="absolute left-5 top-5 h-28 w-28 rounded-full border border-emerald-200" />
                    <div className="absolute left-12 top-12 h-20 w-20 rounded-full border border-emerald-200" />
                    <div className="absolute bottom-8 left-8 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.12)]" />
                    <div className="absolute right-6 top-9 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">
                      Bus active
                    </div>
                    <div className="absolute bottom-7 right-7 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md">
                      8 min away
                    </div>
                    <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                      <BusFront size={30} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {stats.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
                        <p className="text-lg font-extrabold text-emerald-700">{item.value}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-600">
              Everyday transport
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Built for smarter everyday journeys
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              A cleaner, faster way to stay informed before you head out.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-3xl border border-emerald-100 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Icon size={25} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                How it works
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                From route discovery to live tracking, everything is designed for clarity and ease.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                ["01", "Choose your role", "Create an account and pick your travel mode as a passenger or driver."],
                ["02", "Explore routes", "Open routes and plan a trip with confidence."],
                ["03", "Track live updates", "Follow a moving bus and plan your arrival with real-time information."],
              ].map(([number, title, description]) => (
                <div key={number} className="rounded-3xl bg-emerald-50 p-7 ring-1 ring-emerald-100">
                  <span className="text-sm font-bold tracking-[0.2em] text-emerald-600">{number}</span>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-8 rounded-[32px] bg-gradient-to-r from-emerald-600 to-green-600 p-8 text-white shadow-xl shadow-emerald-200 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-100">
                Trusted transport platform
              </p>
              <h2 className="mt-3 text-3xl font-extrabold">Ready to make travel easier?</h2>
              <p className="mt-3 max-w-2xl text-emerald-50/90">
                Whether you are a rider checking the next bus or a driver sharing live route updates,
                Nepal Transit helps everyone stay informed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                Get started <ArrowRight size={18} />
              </Link>
              <Link
                to="/live-map"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Open live map
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3 text-white">
              <div className="rounded-xl bg-emerald-600 p-2 text-white">
                <BusFront size={22} />
              </div>
              <span className="text-lg font-bold">Nepal Transit</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
              Better public transport access, clearer route planning, and smooth travel throughout Nepal.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">Explore</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link to="/routes" className="transition hover:text-white">Bus routes</Link>
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#how-it-works" className="transition hover:text-white">How it works</a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">Account</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link to="/login" className="transition hover:text-white">Sign in</Link>
              <Link to="/register" className="transition hover:text-white">Register</Link>
              <Link to="/choose-role" className="transition hover:text-white">Continue</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">Why people trust us</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" />
                Secure account access
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" />
                Permission-based location tracking
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" />
                Route clarity for daily travel
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Nepal Transit. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
