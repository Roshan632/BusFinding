
import { Link } from "react-router-dom";
import {
  BusFront,
  MapPin,
  Route,
  ShieldCheck,
  UserRound,
  LogOut,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
  const { user, signOut } = useAuth();

  if (!user) return null;

  const content = dashboardContent[user.role];
  const RoleIcon = content.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
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
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-7 text-white shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="mb-3 text-sm font-medium text-blue-100">
                Welcome back
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Hello, {user.name}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
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
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      <ItemIcon size={24} />
                    </div>
                    <ArrowRight
                      size={20}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
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
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                <ShieldCheck size={18} />
                Open admin board
              </Link>
            ) : user.role === "driver" ? (
              <>
                <Link
                  to="/route-planner"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
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
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
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
