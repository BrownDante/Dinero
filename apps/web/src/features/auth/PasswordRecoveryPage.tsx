
import { useState, type FormEvent } from "react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthProvider";

export function PasswordRecoveryPage() {
  const { signOut, clearRecoveryMode } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        "Your password has been updated successfully. You can now sign in using your new password.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { error } = await signOut();

      if (error) throw error;

      clearRecoveryMode();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1>Choose a new password</h1>

      <p>
        Create a new password for your DINERO account.
      </p>

      {successMessage ? (
        <>
          <p role="status">{successMessage}</p>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? "Please wait..." : "Continue to sign in"}
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="newPassword">New password</label>

            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmNewPassword">
              Confirm new password
            </label>

            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              minLength={8}
            />
          </div>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}
