
import { useState } from "react";
import { resetPassword } from "../auth/authService.js";
import "./Login.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!token) {
      setError("This password reset link is invalid or incomplete.");
      return;
    }

    if (password.length < 12 || password.length > 72) {
      setError("Your password must contain between 12 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setNotice("Your password has been changed successfully. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Unable to reset your password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <section className="login__brand" aria-hidden="true">
        <div className="login__logo">
          <span className="login__mark">C</span>
          <span>Connect Projects</span>
        </div>
        <p className="login__pitch">
          Every project, task and deadline in one place.
        </p>
      </section>

      <main className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1>Reset password</h1>
          <p className="login__lead">
            Create a new password for your account.
          </p>

          {error && <p className="login__error" role="alert">{error}</p>}
          {notice && <p className="login__notice" role="status">{notice}</p>}

          {!notice && (
            <>
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>

              <p className="auth__note">
                Use between 12 and 72 characters.
              </p>

              <button
                type="submit"
                className="login__submit"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Update password"}
              </button>
            </>
          )}

          <button
            type="button"
            className="auth__link auth__back"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Back to sign in
          </button>
        </form>
      </main>
    </div>
  );
}
