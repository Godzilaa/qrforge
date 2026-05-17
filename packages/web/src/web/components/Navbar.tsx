import { Link, useLocation } from "wouter";
import { useUser } from "../hooks/useUser";
import { Zap, Grid, PlusSquare, LogOut, LogIn } from "lucide-react";

export function Navbar() {
  const { user, isPro, logout } = useUser();
  const [location] = useLocation();

  return (
    <nav className="border-b border-[#1a1a1a] bg-black sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/">
          <span className="flex items-center gap-2 cursor-pointer group">
            <span className="text-[#00FF41] font-bold text-lg tracking-tight group-hover:glow-green-text transition-all">
              QR<span className="text-white">Forge</span>
            </span>
            <span className="text-[#00FF41] text-xs opacity-50 blink">_</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link to="/create">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-colors ${location === "/create" ? "text-[#00FF41]" : "text-[#888] hover:text-white"}`}>
              <PlusSquare size={13} />
              CREATE
            </span>
          </Link>
          {user && (
            <Link to="/dashboard">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-colors ${location.startsWith("/dashboard") ? "text-[#00FF41]" : "text-[#888] hover:text-white"}`}>
                <Grid size={13} />
                DASHBOARD
              </span>
            </Link>
          )}
          <Link to="/pricing">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-colors ${location === "/pricing" ? "text-[#00FF41]" : "text-[#888] hover:text-white"}`}>
              <Zap size={13} />
              PRICING
            </span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isPro && (
            <span className="text-[10px] text-[#FFB800] border border-[#FFB800]/30 px-2 py-0.5">
              PRO
            </span>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Avatar from Google or initials fallback */}
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || user.email}
                  className="w-7 h-7 rounded-full border border-[#1a1a1a] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-center text-[10px] text-[#555] font-bold">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[#555] text-xs hidden sm:block truncate max-w-[120px]">
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-[#555] hover:text-[#ff3333] text-xs transition-colors"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <Link to="/login">
              <span className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#00FF41] cursor-pointer transition-colors">
                <LogIn size={13} />
                LOGIN
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
