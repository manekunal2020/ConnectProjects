import { useState } from "react";
import { getStoredUser, logout } from "./auth/authService.js";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());

  function handleLogout() {
    logout();
    setUser(null);
  }

  if (!user) return <Login onSuccess={setUser} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
