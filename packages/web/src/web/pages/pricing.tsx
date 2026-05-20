import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "../components/Navbar";
import { AdBanner } from "../components/AdBanner";
import { useUser } from "../hooks/useUser";
import { Check, X, Zap } from "lucide-react";

const FREE_FEATURES = [
  { ok: true, text: "Unlimited static QR codes" },
  { ok: true, text: "All 6 QR types (URL, WiFi, vCard, etc.)" },
  { ok: true, text: "Custom colors" },
  { ok: true, text: "PNG download" },
  { ok: false, text: "Dynamic QR codes (editable redirect)" },
  { ok: false, text: "Scan analytics & charts" },
  { ok: false, text: "Device & browser breakdown" },
  { ok: false, text: "Ad-free experience" },
];

const PRO_FEATURES = [
  { ok: true, text: "Everything in Free" },
  { ok: true, text: "Dynamic QR codes — change URL anytime" },
  { ok: true, text: "Full scan analytics" },
  { ok: true, text: "Device & browser breakdown" },
  { ok: true, text: "30-day scan history" },
  { ok: true, text: "Ad-free experience" },
  { ok: true, text: "Priority support" },
];

const FAQ = [
  {
    q: "Can I use QRForge for free forever?",
    a: "Yes. Static QR codes are free with no limits. Create, download, share.",
  },
  {
    q: "What's a dynamic QR code?",
    a: "A dynamic QR points to a short redirect URL. You can change the destination anytime from your dashboard — without reprinting the QR code.",
  },
  {
    q: "How does billing work?",
    a: "Pro is $5/mo billed monthly. Cancel anytime. Full access immediately.",
  },
];

export default function Pricing() {
  const { user, isPro } = useUser();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const handleUpgrade = async () => {
    if (!user) { window.location.href = "/login"; return; }
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email, name: user.name }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError("Failed to start checkout. Try again.");
      }
    } catch {
      setCheckoutError("Network error. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />
      <AdBanner isPro={isPro} />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[#555] text-xs mb-2 uppercase tracking-widest">$ qrforge --pricing</div>
          <h1 className="text-2xl font-bold mb-2">
            Simple pricing<span className="text-[#00FF41]">.</span>
          </h1>
          <p className="text-[#555] text-sm">Free forever. Upgrade when you need analytics.</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {/* Free */}
          <div className="border border-[#1a1a1a] bg-[#030303] p-6">
            <div className="mb-6">
              <div className="text-[#555] text-xs uppercase tracking-widest mb-1">Free</div>
              <div className="text-3xl font-bold">$0</div>
              <div className="text-[#444] text-xs mt-1">Forever. No credit card.</div>
            </div>

            <div className="space-y-2 mb-6">
              {FREE_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2 text-sm">
                  {f.ok ? (
                    <Check size={12} className="text-[#00FF41] flex-shrink-0" />
                  ) : (
                    <X size={12} className="text-[#333] flex-shrink-0" />
                  )}
                  <span className={f.ok ? "text-[#888]" : "text-[#333]"}>{f.text}</span>
                </div>
              ))}
            </div>

            {!user ? (
              <Link to="/login">
                <button className="w-full border border-[#1a1a1a] text-[#888] text-xs py-2.5 hover:border-[#555] hover:text-white transition-colors">
                  GET STARTED FREE
                </button>
              </Link>
            ) : !isPro ? (
              <button className="w-full border border-[#00FF41]/20 text-[#00FF41] text-xs py-2.5 cursor-default">
                ✓ YOUR CURRENT PLAN
              </button>
            ) : (
              <button className="w-full border border-[#1a1a1a] text-[#333] text-xs py-2.5 cursor-default">
                FREE PLAN
              </button>
            )}
          </div>

          {/* Pro */}
          <div className="border border-[#00FF41]/30 bg-[#030303] p-6 relative">
            <div className="absolute top-4 right-4">
              <span className="text-[9px] bg-[#FFB800] text-black font-bold px-2 py-0.5">
                POPULAR
              </span>
            </div>

            <div className="mb-6">
              <div className="text-[#00FF41] text-xs uppercase tracking-widest mb-1 flex items-center gap-1">
                <Zap size={10} />
                Pro
              </div>
              <div className="text-3xl font-bold">
                $5
                <span className="text-[#444] text-sm font-normal">/mo</span>
              </div>
              <div className="text-[#444] text-xs mt-1">Cancel anytime.</div>
            </div>

            <div className="space-y-2 mb-6">
              {PRO_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2 text-sm">
                  <Check size={12} className="text-[#00FF41] flex-shrink-0" />
                  <span className="text-[#888]">{f.text}</span>
                </div>
              ))}
            </div>

            {isPro ? (
              <button className="w-full border border-[#00FF41]/30 text-[#00FF41] text-xs py-2.5 cursor-default">
                ✓ YOUR CURRENT PLAN
              </button>
            ) : (
              <>
                {checkoutError && (
                  <div className="text-[#ff4444] text-xs border border-[#ff4444]/20 bg-[#ff4444]/5 px-3 py-2 mb-2">
                    {checkoutError}
                  </div>
                )}
                <button
                  className="w-full bg-[#00FF41] text-black font-bold text-xs py-2.5 hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "LOADING..." : "UPGRADE TO PRO"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <div className="text-[#555] text-xs mb-4 uppercase tracking-widest">$ cat faq.txt</div>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="border border-[#0d0d0d] bg-[#030303] p-4">
                <div className="text-white text-sm mb-1 font-bold">{f.q}</div>
                <div className="text-[#555] text-xs leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border border-[#0d0d0d] bg-[#030303] p-8 text-center">
          <div className="text-[#555] text-xs mb-3">Start free, no account needed</div>
          <Link to="/create">
            <button className="bg-[#00FF41] text-black font-bold text-sm px-8 py-2.5 hover:bg-[#00cc33] transition-colors">
              CREATE FREE QR CODE
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
