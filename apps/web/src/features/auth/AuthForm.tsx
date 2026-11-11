
import { useState, type FormEvent } from "react";
import { authService } from "./authService";
import type {
  AuthMode,
  AuthFormErrors,
  LoginFormData,
  SignupFormData,
} from "./auth.types";

interface AuthFormProps {
  onModeChange: (mode: AuthMode) => void;
}

export function AuthForm({ onModeChange }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setForgotPassword(false);
    onModeChange(nextMode);
    setErrors({});
    setSuccessMessage("");
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSuccessMessage("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: "Please enter a valid email address." });
      return;
    }

    setLoading(true);

    try {
      const { error } = await authService.requestPasswordReset(email.trim());

      if (error) throw error;

      setSuccessMessage(
        "If an account exists for this email, a password-reset link will be sent. Please check your inbox.",
      );
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Unable to request a reset link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function validate(): boolean {
    const nextErrors: AuthFormErrors = {};

    if (mode === "signup" && !fullName.trim()) {
      nextErrors.fullName = "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (mode === "signup" && password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");

    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === "signup") {
        const input: SignupFormData = {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        };

        const { data, error } = await authService.signUp(input);

        if (error) throw error;

        if (data.session) {
          setSuccessMessage("Your account is ready. Welcome to DINERO!");
        } else {
          setSuccessMessage(
            "Account created. Please check your email to confirm your address.",
          );
        }
      } else {
        const input: LoginFormData = {
          email: email.trim(),
          password,
        };

        const { error } = await authService.signIn(input);

        if (error) throw error;
      }
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (forgotPassword) {
    return (
      <section>
        <h1>Reset your password</h1>
        <p>Enter your email address and we'll send you a reset link.</p>

        <form onSubmit={handleForgotPassword} noValidate>
          <div>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {errors.email && <p role="alert">{errors.email}</p>}
          </div>

          {errors.general && <p role="alert">{errors.general}</p>}
          {successMessage && <p role="status">{successMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setForgotPassword(false);
            setErrors({});
            setSuccessMessage("");
          }}
        >
          Back to sign in
        </button>
      </section>
    );
  }

  return (
    <section>
      <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>

      <p>
        {mode === "signup"
          ? "Start making smarter financial decisions."
          : "Sign in to continue to DINERO."}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {mode === "signup" && (
          <div>
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
            {errors.fullName && <p role="alert">{errors.fullName}</p>}
          </div>
        )}

        <div>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {errors.email && <p role="alert">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {errors.password && <p role="alert">{errors.password}</p>}
        </div>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setForgotPassword(true);
              setErrors({});
              setSuccessMessage("");
            }}
          >
            Forgot password?
          </button>
        )}

        {mode === "signup" && (
          <div>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            {errors.confirmPassword && (
              <p role="alert">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {errors.general && <p role="alert">{errors.general}</p>}
        {successMessage && <p role="status">{successMessage}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p>
        {mode === "signup"
          ? "Already have an account?"
          : "New to DINERO?"}{" "}
        <button
          type="button"
          onClick={() =>
            changeMode(mode === "signup" ? "login" : "signup")
          }
        >
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
