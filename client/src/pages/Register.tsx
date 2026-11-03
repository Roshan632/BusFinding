
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusFront, Eye, EyeOff } from "lucide-react";
import { register } from "../services/auth";
import { useToast } from "../components/ToastProvider";

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      const message = "Please enter your full name.";
      setError(message);
      showToast("error", message);
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      const message = "Please enter a valid email address.";
      setError(message);
      showToast("error", message);
      return;
    }

    if (password.length < 10) {
      const message = "Password must be at least 10 characters long.";
      setError(message);
      showToast("error", message);
      return;
    }

    if (!termsAccepted) {
      const message = "You must accept the terms and conditions before continuing.";
      setError(message);
      showToast("error", message);
      return;
    }

    setLoading(true);

    try {
      await register(trimmedName, trimmedEmail, password, termsAccepted);
      showToast("success", "Account created! Please sign in.");
      navigate("/login", {
        state: { message: "Account created! Please sign in." },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
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

        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-slate-500">
          Join Nepal Transit and plan your next ride.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Full name
            </label>
            <input
              id="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

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
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={10}
                maxLength={72}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
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
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          
<label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
  <input
    type="checkbox"
    checked={termsAccepted}
    onChange={(event) => setTermsAccepted(event.target.checked)}
    required
    className="mt-1 h-4 w-4 accent-emerald-600"
  />
  <span>
    I agree to the{" "}
    <a href="/terms" className="font-semibold text-emerald-600 hover:underline">
      Terms and Conditions
    </a>{" "}
    and understand how location sharing works.
  </span>
</label>


          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
