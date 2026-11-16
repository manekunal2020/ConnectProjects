
import { useState } from "react";
import { getStoredUser, logout } from "./auth/authService.js";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());

  function handleLogout() {
    logout();
    setUser(null);
  }

  // Show the reset-password page when the email link is opened
  if (window.location.pathname === "/reset-password") {
    return <ResetPassword />;
  }

  if (!user) return <Login onSuccess={setUser} />;

  return <Dashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} />;
}
