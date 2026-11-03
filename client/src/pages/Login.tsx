import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusFront, Eye, EyeOff } from "lucide-react";
import { login } from "../services/auth";
import { useAuth } from "../context/AuthContext.tsx";
import { useToast } from "../components/ToastProvider";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password.trim()) {
      const message = "Please enter both your email and password.";
      setError(message);
      showToast("error", message);
      return;
    }

    setLoading(true);

    try {
      const data = await login(trimmedEmail, password);

      signIn(data.user, data.token);
      showToast("success", `Welcome back, ${data.user.name.split(" ")[0]}!`);
      navigate("/choose-role");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <span className="rounded-xl bg-emerald-600 p-2 text-white">
            <BusFront size={25} />
          </span>
          <span className="text-xl font-bold">
            Nepal<span className="text-emerald-600">Transit</span>
          </span>
        </Link>

        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-slate-500">Sign in to continue your journey.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to Nepal Transit?{" "}
          <Link
            to="/register"
            className="font-semibold text-emerald-700 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
