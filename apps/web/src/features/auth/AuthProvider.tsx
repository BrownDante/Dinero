
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AuthError, Session, User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }

      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        setRecoveryMode(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function clearRecoveryMode() {
    setRecoveryMode(false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    return { error };
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        recoveryMode,
        clearRecoveryMode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
