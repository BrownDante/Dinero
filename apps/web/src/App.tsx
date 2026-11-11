
import { useAuth } from "./features/auth/AuthProvider";
import AuthPage from "./features/auth/AuthPage";

function App() {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return <main>Loading DINERO...</main>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <main>
      <h1>Welcome to DINERO!</h1>

      <p>You are successfully signed in.</p>

      <button
        onClick={async () => {
          const { error } = await signOut();

          if (error) {
            console.error("Sign-out failed:", error.message);
          }
        }}
      >
        Sign out
      </button>
    </main>
  );
}

export default App;
