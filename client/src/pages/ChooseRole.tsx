
import { Link, useNavigate } from "react-router-dom";
import { BusFront, UserRound, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { updateRole } from "../services/auth";

export default function ChooseRole() {
  const navigate = useNavigate();
  const { user, token, signIn, signOut } = useAuth();

  async function chooseDriver() {
    if (!user || !token) return;

    try {
      const data = await updateRole("passenger", token);
      signIn(data.user, data.token);
      navigate("/verification", {
        replace: true,
        state: { intent: "driver" },
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not continue with driver verification."
      );
    }
  }

  async function choosePassenger() {
    if (!user || !token) return;

    try {
      const data = await updateRole("passenger", token);
      signIn(data.user, data.token);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not update your role."
      );
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">Please sign in to continue.</p>
          <Link
            to="/login"
            className="mt-4 inline-block font-semibold text-blue-600"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-blue-600 p-4 text-white">
            <BusFront size={34} />
          </div>
        </div>

        <p className="text-center text-sm font-semibold text-blue-600">
          NEPAL TRANSIT
        </p>

        <h1 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
          Welcome, {user.name}!
        </h1>

        <p className="mt-3 text-center leading-6 text-slate-500">
          How would you like to use Nepal Transit today?
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => void chooseDriver()}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50"
          >
            <span className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <BusFront size={26} />
            </span>

            <span className="flex-1">
              <span className="block font-bold text-slate-900">
                Yes, I am a driver
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                Manage your assigned bus and share GPS.
              </span>
            </span>

            <ArrowRight size={20} className="text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => void choosePassenger()}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-50"
          >
            <span className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <UserRound size={26} />
            </span>

            <span className="flex-1">
              <span className="block font-bold text-slate-900">
                No, I am a passenger
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                View buses and their latest GPS locations.
              </span>
            </span>

            <ArrowRight size={20} className="text-slate-400" />
          </button>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </section>
    </main>
  );
}
