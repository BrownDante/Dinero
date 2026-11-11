
import { AuthForm } from "./AuthForm";
import { PasswordRecoveryPage } from "./PasswordRecoveryPage";
import { useAuth } from "./AuthProvider";

export default function AuthPage() {
  const { loading, recoveryMode } = useAuth();

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark">D</span>
          <span>DINERO</span>
        </div>

        <div className="auth-brand-content">
          <p className="auth-eyebrow">FINANCIAL AUTONOMY, REIMAGINED</p>

          <h2>
            Your money.
            <br />
            Your decisions.
            <br />
            <span>Your rules.</span>
          </h2>

          <p className="auth-brand-description">
            One intelligent space to understand commitments, make better
            decisions, and stay in control of your spending.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span>PERSONAL FINANCE</span>
          <span>BUSINESS INTELLIGENCE</span>
          <span>BUILT AROUND YOU</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">D</span>
            <span>DINERO</span>
          </div>

          {loading ? (
            <p role="status">Checking your session...</p>
          ) : recoveryMode ? (
            <PasswordRecoveryPage />
          ) : (
            <AuthForm onModeChange={() => {}} />
          )}

          <p className="auth-terms">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}
