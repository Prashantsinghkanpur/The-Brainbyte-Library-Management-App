import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "brainbyte-auth";

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { token: "", user: null };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return { token: "", user: null };
    }
  });
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
  }, [authState]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const themeMode = (authState.user?.themeMode || "LIGHT").toUpperCase();
      const shouldUseDark = themeMode === "DARK" || (themeMode === "SYSTEM" && mediaQuery.matches);

      root.classList.toggle("dark", shouldUseDark);
      root.dataset.themeMode = themeMode;
      root.style.colorScheme = shouldUseDark ? "dark" : "light";
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [authState.user?.themeMode]);

  const setSession = (payload) => {
    setAuthState({
      token: payload.token,
      user: payload.user
    });
  };

  const clearSession = () => {
    setAuthState({ token: "", user: null });
  };

  const login = async (credentials) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: credentials
    });
    setSession(data);
    return data;
  };

  const register = async (payload) => {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: payload
    });
    setSession(data);
    return data;
  };

  const patchUser = (nextUser) => {
    setAuthState((current) => ({
      ...current,
      user: typeof nextUser === "function" ? nextUser(current.user) : nextUser
    }));
  };

  const value = useMemo(
    () => ({
      token: authState.token,
      user: authState.user,
      isAuthenticated: Boolean(authState.token),
      isBootstrapping,
      setIsBootstrapping,
      setSession,
      login,
      register,
      logout: clearSession,
      patchUser
    }),
    [authState, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
