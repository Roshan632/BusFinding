import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { uploadDocument } from "../lib/supabase";
import { useToast } from "../components/ToastProvider";

const API_URL = "http://localhost:5000/api";

export default function VerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, signIn } = useAuth();
  const { showToast } = useToast();

  const requestedRole =
    location.state && typeof location.state === "object" && "intent" in location.state
      ? String(location.state.intent)
      : user?.role ?? "passenger";

  const isDriver = requestedRole === "driver" || user?.role === "driver";
  const [phone, setPhone] = useState("");
  const [busPlateNumber, setBusPlateNumber] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [driverLicense, setDriverLicense] = useState<File | null>(null);
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">Please sign in to continue.</p>
          <Link to="/login" className="mt-4 inline-block font-semibold text-emerald-600">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      const message = "Your session has expired, please sign in again.";
      setError(message);
      showToast("error", message);
      return;
    }

    try {
      setLoading(true);

      const payload: Record<string, string | null> = {
        phone,
        requestedRole: isDriver ? "driver" : "passenger",
      };

      if (isDriver) {
        if (!phone || !busPlateNumber || !profilePhoto || !driverLicense) {
          throw new Error("Please fill in all required driver information and upload the files.");
        }

        payload.profilePhotoUrl = await uploadDocument(profilePhoto, "profile-photos");
        payload.driverLicenseUrl = await uploadDocument(driverLicense, "driver-licenses");
        payload.busPlateNumber = busPlateNumber.trim();
      } else {
        if (!nidFront || !nidBack) {
          throw new Error("Passengers must upload both sides of the NID card.");
        }

        payload.nidFrontUrl = await uploadDocument(nidFront, "nid-front");
        payload.nidBackUrl = await uploadDocument(nidBack, "nid-back");
      }

      const response = await fetch(`${API_URL}/profile/verification`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save verification details.");
      }

      signIn(data.user, token);

      if (isDriver) {
        const driverRequestResponse = await fetch(`${API_URL}/driver-requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const driverRequestData = await driverRequestResponse.json().catch(() => ({}));

        if (!driverRequestResponse.ok) {
          throw new Error(
            driverRequestData.message || "Verification saved, but your driver request could not be submitted."
          );
        }

        const successMessage = "Verification details uploaded successfully. Your driver request is pending admin approval.";
        setMessage(successMessage);
        showToast("success", successMessage);
      } else {
        const successMessage = "Verification details uploaded successfully.";
        setMessage(successMessage);
        showToast("success", successMessage);
      }

      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              {isDriver ? "Driver verification" : "Passenger verification"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Upload required documents
            </h1>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <ShieldCheck size={32} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone number
            </label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="+977 98XXXXXXXX"
              required
            />
          </div>

          {isDriver && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Bus plate number
                </label>
                <input
                  value={busPlateNumber}
                  onChange={(event) => setBusPlateNumber(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Example: BA 1 KA 1234"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FileInput
                  label="Profile photo"
                  file={profilePhoto}
                  onChange={setProfilePhoto}
                />
                <FileInput
                  label="Driving license"
                  file={driverLicense}
                  onChange={setDriverLicense}
                />
              </div>
            </>
          )}

          {!isDriver && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FileInput label="NID front side" file={nidFront} onChange={setNidFront} />
              <FileInput label="NID back side" file={nidBack} onChange={setNidBack} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <p>{message}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Uploading..." : "Save verification"}
            </button>

            <Link to="/dashboard" className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100">
              Back to dashboard
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

type FileInputProps = {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
};

function FileInput({ label, file, onChange }: FileInputProps) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Upload size={18} className="text-emerald-600" />
          <span>{file ? file.name : "Choose file"}</span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
          required={true}
        />
      </div>
    </label>
  );
}
