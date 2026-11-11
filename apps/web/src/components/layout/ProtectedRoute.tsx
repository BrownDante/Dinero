
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../features/auth/AuthProvider";

export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <main>Loading DINERO...</main>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
