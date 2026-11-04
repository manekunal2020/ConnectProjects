import { useState } from "react";
import { login, submitAccountRequest } from "../auth/authService.js";
import "./Login.css";

export default function Login({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      if (mode === "login") {
        if (!username.trim() || !password) throw new Error("Enter your username and password.");
        const user = await login(username, password);
        onSuccess(user);
      } else if (mode === "create") {
        if (!name.trim() || !username.trim() || !email.trim()) {
          throw new Error("Enter your name, requested username, and email address.");
        }
        if (!/^[a-z0-9._-]{3,30}$/i.test(username.trim())) {
          throw new Error("Username must be 3-30 characters using letters, numbers, dots, underscores, or hyphens.");
        }
        await submitAccountRequest({ name, username, email });
        setUsername(username.trim().toLowerCase());
        setPassword("");
        setName("");
        setEmail("");
        setNotice("Your enquiry was sent to the Super User. If approved, they will create your account and share your sign-in details.");
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "create" ? "Request an account" : mode === "reset" ? "Reset password" : "Sign in";

  return (
    <div className="login">
      <section className="login__brand" aria-hidden="true">
        <div className="login__logo">
          <span className="login__mark">C</span>
          <span>Connect Projects</span>
        </div>
        <p className="login__pitch">Every project, task and deadline in one place.</p>
        <ul className="login__roles">
          <li><strong>Super User</strong> manages users and sees every project</li>
          <li><strong>Admin</strong> runs projects and reviews reports</li>
          <li><strong>Project Lead</strong> tracks assigned tasks</li>
        </ul>
      </section>

      <main className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1>{title}</h1>
          <p className="login__lead">
            {mode === "create"
              ? "Send an account enquiry to the Super User. Approved accounts are created by the Super User."
              : mode === "reset"
                ? "For a password reset, contact your Super User."
                : "Use the username and password provided to you."}
          </p>

          {error && (
            <p className="login__error" role="alert">{error}</p>
          )}
          {notice && (
            <p className="login__notice" role="status">{notice}</p>
          )}

          {mode === "create" && (
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!error}
              />
            </label>
          )}
          {mode !== "reset" && (
            <label className="field">
              <span>{mode === "create" ? "Requested username" : "Username"}</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={!!error}
              />
            </label>
          )}

          {mode === "login" ? (
            <label className="field">
              <span>Password</span>
              <div className="field__password">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          ) : mode === "create" ? (
            <>
              <label className="field">
                <span>Email address</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
              </label>
              <p className="auth__note">
                The Super User reviews enquiries and creates approved accounts. Do not enter a password here.
              </p>
            </>
          ) : (
            <p className="auth__warning">
              Password resets are handled by the Super User. Contact them to receive a new password.
            </p>
          )}

          {mode === "login" && (
            <button type="button" className="auth__link auth__forgot" onClick={() => changeMode("reset")}>
              Forgot password?
            </button>
          )}

          {mode !== "reset" && (
            <button type="submit" className="login__submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "create" ? "Send enquiry" : "Sign in"}
            </button>
          )}

          {mode === "login" ? (
            <>
              <p className="auth__switch">
                Need an account?{" "}
                <button type="button" className="auth__link" onClick={() => changeMode("create")}>Send an enquiry</button>
                {" "}to the Super User.
              </p>
            </>
          ) : (
            <button type="button" className="auth__link auth__back" onClick={() => changeMode("login")}>
              Back to sign in
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
