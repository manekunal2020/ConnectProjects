import { useState } from "react";
import { demoAccounts, login } from "../auth/authService.js";
import "./Login.css";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      const user = await login(username, password);
      onSuccess(user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  }

  return (
    <div className="login">
      <section className="login__brand" aria-hidden="true">
        <div className="login__logo">
          <span className="login__mark">C</span>
          <span>Connect Projects</span>
        </div>
        <p className="login__pitch">Every project, task and deadline in one place.</p>
        <ul className="login__roles">
          <li><strong>Admin</strong> manages users and sees every project</li>
          <li><strong>Project Lead</strong> runs projects and reviews reports</li>
          <li><strong>Team Member</strong> tracks assigned tasks</li>
        </ul>
      </section>

      <main className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1>Sign in</h1>
          <p className="login__lead">Use a demo account below or enter your credentials.</p>

          {error && <p className="login__error" role="alert">{error}</p>}

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={!!error}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="field__password">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={!!error}
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="submit" className="login__submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="demo">
            <p className="demo__title">Demo accounts</p>
            <ul>
              {demoAccounts.map((account) => (
                <li key={account.username}>
                  <button type="button" onClick={() => fillDemo(account)}>
                    <strong>{account.role}</strong>
                    <span>{account.username} / {account.password}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="demo__note">
              Demo-only sign-in; connect a backend before using real accounts.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
