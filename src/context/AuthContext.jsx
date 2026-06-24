import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => (localStorage.getItem("userId") ? undefined : null)); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Check if there's a logged-in user in localStorage
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      return;
    }

    authService.getUserById(storedUserId)
      .then((userData) => {
        if (userData) {
          setUser(userData);
          setProfile(userData);
          return;
        }
        localStorage.removeItem("userId");
        setUser(null);
      })
      .catch(() => {
        localStorage.removeItem("userId");
        setUser(null);
      });
  }, []);

  const login = async (emailOrName, password) => {
    const user = await authService.login(emailOrName, password);
    setUser(user);
    setProfile(user);
    localStorage.setItem("userId", user.id);
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem("userId");
  };

  const isAdmin = profile?.role === "admin";
  const isLoading = user === undefined;

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
