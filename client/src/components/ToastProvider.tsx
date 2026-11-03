import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, message }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm",
              toast.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              toast.type === "error" && "border-red-200 bg-red-50 text-red-800",
              toast.type === "info" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="mt-0.5 shrink-0">
              {toast.type === "success" ? <CheckCircle2 size={18} /> : toast.type === "error" ? <CircleAlert size={18} /> : <Info size={18} />}
            </span>
            <p className="text-sm font-medium leading-6">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }

  return context;
}
