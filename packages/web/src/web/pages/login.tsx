import { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { useUser } from "../hooks/useUser";

export default function Login() {
  const { login } = useUser();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
      });
      const data = await res.json();
      if (data.user) {
        login(data.user);
        setLocation("/dashboard");
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="text-[#00FF41] text-4xl font-bold mb-2">
              QR<span className="text-white">Forge</span>
            </div>
            <p className="text-[#555] text-xs">No passwords. Just your email.</p>
          </div>

          <form onSubmit={handleSubmit} className="border border-[#1a1a1a] p-6 space-y-4 bg-[#050505]">
            <div className="text-[#00FF41] text-xs mb-4">
              <span className="opacity-50">$ </span>
              <span className="blink">authenticate</span>
            </div>

            <div className="space-y-1">
              <label className="text-[#555] text-xs uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-3 py-2 text-sm text-white placeholder-[#333] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#555] text-xs uppercase tracking-widest">Name <span className="text-[#333]">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-3 py-2 text-sm text-white placeholder-[#333] transition-colors"
              />
            </div>

            {error && (
              <div className="text-[#ff3333] text-xs border border-[#ff3333]/30 px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00FF41] text-black font-bold text-sm py-2.5 hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "CONNECTING..." : "ENTER"}
            </button>

            <p className="text-[#333] text-[10px] text-center pt-2">
              New user? We'll create your account automatically.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
