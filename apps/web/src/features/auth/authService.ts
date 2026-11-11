
import { supabase } from "../../lib/supabase";

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export const authService = {
  async signUp({ fullName, email, password }: SignUpInput) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: window.location.origin,
      },
    });
  },

  async signIn({ email, password }: SignInInput) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  async requestPasswordReset(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
  },
};
