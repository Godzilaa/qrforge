import { useState, useEffect } from "react";

const USER_KEY = "qrforge_user";

export interface AppUser {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: string;
  googleId?: string | null;
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

  // Handle Google OAuth callback — ?auth=<base64url JSON>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authPayload = params.get("auth");
    if (authPayload) {
      try {
        const decoded = JSON.parse(atob(authPayload.replace(/-/g, "+").replace(/_/g, "/")));
        if (decoded?.id && decoded?.email) {
          localStorage.setItem(USER_KEY, JSON.stringify(decoded));
          setUser(decoded);
        }
      } catch {
        // malformed payload — ignore
      }
      // Clean the URL
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  const login = (u: AppUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  // Refresh user from DB (e.g. after plan upgrade)
  const refresh = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) login(data.user);
      }
    } catch { /* silent */ }
  };

  const isPro = user?.plan === "pro";

  return { user, login, logout, isPro, refresh };
}
