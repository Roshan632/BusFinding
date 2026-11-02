
const API_URL = "http://localhost:5000/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "passenger" | "driver" | "admin";
  status: "active" | "suspended";
};

type AuthResponse = {
  message: string;
  user: User;
  token: string;
};

async function request<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  body?: Record<string, string | boolean | null>,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data as T;
}

export function register(
  name: string,
  email: string,
  password: string,
  termsAccepted: boolean
) {
  return request<AuthResponse>("/auth/register", "POST", {
    name,
    email,
    password,
    termsAccepted: String(termsAccepted),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", "POST", {
    email,
    password,
  });
}

export function updateRole(role: "passenger" | "driver", token: string) {
  return request<AuthResponse>("/auth/role", "PATCH", { role }, token);
}
