
import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./features/auth/AuthProvider";
import AuthPage from "./features/auth/AuthPage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <main>Loading DINERO...</main>;
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          session ? <Navigate to="/app" replace /> : <AuthPage />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/app"
          element={<main>Welcome to DINERO!</main>}
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate to={session ? "/app" : "/auth"} replace />
        }
      />
    </Routes>
  );
}

export default App;
