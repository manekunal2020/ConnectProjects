const DEMO_USERS = [
  { username: "admin", password: "admin123", name: "Ananya Kulkarni", role: "Admin" },
  { username: "lead", password: "lead123", name: "Priya Nair", role: "Project Lead" },
  { username: "member", password: "member123", name: "Meera Joshi", role: "Team Member" },
];

const STORAGE_KEY = "connect-projects-user";
const VALID_ROLES = new Set(DEMO_USERS.map((user) => user.role));

export const demoAccounts = DEMO_USERS.map(({ username, password, role }) => ({
  username,
  password,
  role,
}));

export async function login(username, password) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const normalizedUsername = username.trim().toLowerCase();
  const match = DEMO_USERS.find(
    (user) => user.username === normalizedUsername && user.password === password,
  );

  if (!match) {
    throw new Error("Incorrect username or password.");
  }

  const user = { username: match.username, name: match.name, role: match.role };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function getStoredUser() {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const user = JSON.parse(stored);
    if (
      typeof user?.username !== "string" ||
      typeof user?.name !== "string" ||
      !VALID_ROLES.has(user?.role)
    ) {
      logout();
      return null;
    }

    return user;
  } catch {
    logout();
    return null;
  }
}

export function logout() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}
