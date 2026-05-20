import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { useUser } from "../hooks/useUser";

export default function Login() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      const messages: Record<string, string> = {
        oauth_denied: "Google sign-in was cancelled.",
        not_configured: "Google OAuth is not configured yet.",
        token_failed: "Failed to exchange auth token. Try again.",
        no_email: "Google didn't return an email address.",
        server_error: "Server error during sign-in. Try again.",
      };
      setError(messages[err] || "Sign-in failed. Try again.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to initiate Google sign-in.");
        setGoogleLoading(false);
      }
    } catch {
      setError("Network error. Try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="text-[#00FF41] text-4xl font-bold mb-2">
              QR<span className="text-white">Forge</span>
            </div>
            <p className="text-[#555] text-xs">Sign in to save & track your QR codes.</p>
          </div>

          <div className="border border-[#1a1a1a] bg-[#050505]">
            <div className="p-6 space-y-4">
              <div className="text-[#00FF41] text-xs">
                <span className="opacity-50">$ </span>
                <span>authenticate</span>
              </div>

              {error && (
                <div className="text-[#ff4444] text-xs border border-[#ff4444]/20 bg-[#ff4444]/5 px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-[#2a2a2a] hover:border-[#00FF41]/50 bg-[#0a0a0a] hover:bg-[#00FF41]/5 text-white text-sm py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <span className="text-[#555] text-xs">CONNECTING TO GOOGLE...</span>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-sm font-medium">Continue with Google</span>
                  </>
                )}
              </button>

              <p className="text-[#2a2a2a] text-[10px] text-center">
                New user? Account created automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
