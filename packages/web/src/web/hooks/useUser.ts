import { useState, useEffect } from "react";

const USER_KEY = "qrforge_user";

export interface AppUser {
  id: number;
  email: string;
  name: string | null;
  plan: string;
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (u: AppUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const isPro = user?.plan === "pro";

  return { user, login, logout, isPro };
}
