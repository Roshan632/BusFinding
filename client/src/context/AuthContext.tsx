

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../services/auth";

const API_URL = "http://localhost:5000/api";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("transit_token")
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Your session has expired.");
        }

        const data = await response.json();

        if (!cancelled) {
          setUser(data.user);
          sessionStorage.setItem(
            "transit_user",
            JSON.stringify(data.user)
          );
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem("transit_token");
          sessionStorage.removeItem("transit_user");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function signIn(nextUser: User, nextToken: string) {
    sessionStorage.setItem("transit_token", nextToken);
    sessionStorage.setItem("transit_user", JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
  }

  function signOut() {
    sessionStorage.removeItem("transit_token");
    sessionStorage.removeItem("transit_user");
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
