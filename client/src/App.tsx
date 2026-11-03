
import {
  BrowserRouter,
  
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/ToastProvider";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from "./pages/Register";
import ChooseRole from "./pages/ChooseRole.tsx";
import DriverTracking from "./pages/DriverTracking.tsx";
import LiveMap from "./pages/LiveMap.tsx";
import Terms from "./pages/Terms.tsx";
import VerificationPage from "./pages/Verification.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import RoutePlanner from "./pages/RoutePlanner.tsx";
import RoutesPage from "./pages/RoutesPage.tsx";

// function Home() {
//   const { user, loading } = useAuth();

//   return (
//     <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
//       <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
//         <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">
//           🚌
//         </div>

//         <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
//           Nepal Transit
//         </h1>
//         <p className="mx-auto mt-3 max-w-md leading-7 text-slate-500">
//           Your public transport companion. Find routes and prepare for real-time
//           bus tracking across Nepal.
//         </p>

//         <div className="mt-8 flex flex-wrap justify-center gap-3">
//           {loading ? (
//             <p className="text-sm text-slate-500">Checking your session...</p>
//           ) : user ? (
//             <Link
//               to="/dashboard"
//               className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
//             >
//               Open dashboard
//             </Link>
//           ) : (
//             <>
//               <Link
//                 to="/login"
//                 className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
//               >
//                 Sign in
//               </Link>
//               <Link
//                 to="/register"
//                 className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
//               >
//                 Create account
//               </Link>
//             </>
//           )}
//         </div>
//       </section>
//     </main>
//   );
// }

function getDefaultRouteForRole(role?: string) {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  if (role === "passenger") return "/choose-role";
  return "/choose-role";
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading Nepal Transit...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/login"
        element={
          user ? <Navigate to={getDefaultRouteForRole(user.role)} replace /> : <Login />
        }
      />

      <Route
        path="/register"
        element={
          user ? <Navigate to={getDefaultRouteForRole(user.role)} replace /> : <Register />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      <Route
        element={<ProtectedRoute allowedRoles={["passenger"]} />}
      >
        <Route
          path="/passenger"
          element={<Navigate to="/dashboard" replace />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["driver"]} />}>
        <Route path="/driver" element={<DriverTracking />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/verification" element={<VerificationPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["driver"]} />}>
        <Route path="/route-planner" element={<RoutePlanner />} />
      </Route>

      <Route
        path="/choose-role"
        element={
          user ? (
            user.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <ChooseRole />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/live-map" element={<LiveMap />} />
      <Route path="/routes" element={<RoutesPage />} />
      <Route path="/terms" element={<Terms />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
