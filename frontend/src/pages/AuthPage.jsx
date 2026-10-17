import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { logIn, signUp } from "../services/api";

export default function AuthPage({ mode, setPage, onAuthenticated }) {
  const isSignup = mode === "signup";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    passwordConfirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  }

  async function submitForm(event) {
    event.preventDefault();
    setError("");

    if (isSignup && form.password !== form.passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = isSignup
        ? await signUp(form)
        : await logIn(form);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(
        isSignup
          ? "Unable to create your account right now."
          : requestError.response?.data?.message ||
              "We couldn't complete your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-showcase">
        <div className="auth-showcase-brand">
          <span className="auth-showcase-icon">
            <Activity size={24} />
          </span>
          <span>RoadShield <strong>AI</strong></span>
        </div>

        <div className="auth-showcase-copy">
          <p className="eyebrow">SAFER ROADS START HERE</p>
          <h1>Help build a clearer picture of our roads.</h1>
          <p>
            Sign in to continue your work with AI-powered road damage
            detection and reporting.
          </p>
        </div>

        <div className="auth-trust-note">
          <ShieldCheck size={18} />
          <span>Your account details are protected.</span>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-heading">
          <span className="auth-form-icon">
            <LockKeyhole size={19} />
          </span>
          <p className="eyebrow">{isSignup ? "GET STARTED" : "WELCOME BACK"}</p>
          <h2 id="auth-title">{isSignup ? "Create your account" : "Sign in"}</h2>
          <p>
            {isSignup
              ? "Create an account to get started with RoadShield AI."
              : "Enter your details to access your RoadShield workspace."}
          </p>
        </div>

        <form className="auth-form" onSubmit={submitForm}>
          {isSignup && (
            <label className="auth-field">
              <span>Full name</span>
              <span className="auth-input-wrap">
                <UserRound size={17} aria-hidden="true" />
                <input
                  autoComplete="name"
                  name="name"
                  onChange={updateField}
                  placeholder="Your name"
                  required
                  value={form.name}
                />
              </span>
            </label>
          )}

          <label className="auth-field">
            <span>Email address</span>
            <span className="auth-input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                autoComplete="email"
                name="email"
                onChange={updateField}
                placeholder="you@example.com"
                required
                type="email"
                value={form.email}
              />
            </span>
          </label>

          {isSignup && (
            <label className="auth-field">
              <span>Phone number <small>(optional)</small></span>
              <span className="auth-input-wrap">
                <Phone size={17} aria-hidden="true" />
                <input
                  autoComplete="tel"
                  name="phoneNumber"
                  onChange={updateField}
                  placeholder="Your phone number"
                  type="tel"
                  value={form.phoneNumber}
                />
              </span>
            </label>
          )}

          <label className="auth-field">
            <span>Password</span>
            <span className="auth-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                name="password"
                onChange={updateField}
                placeholder="At least 8 characters"
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-visibility"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {isSignup && (
            <label className="auth-field">
              <span>Confirm password</span>
              <span className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  autoComplete="new-password"
                  minLength={8}
                  name="passwordConfirm"
                  onChange={updateField}
                  placeholder="Enter your password again"
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.passwordConfirm}
                />
              </span>
            </label>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button auth-submit" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Sign in"}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to RoadShield AI?"}{" "}
          <button
            onClick={() => setPage(isSignup ? "login" : "signup")}
            type="button"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </section>
  );
}
