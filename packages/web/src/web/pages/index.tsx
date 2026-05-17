import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Navbar } from "../components/Navbar";
import { AdBanner } from "../components/AdBanner";
import { useUser } from "../hooks/useUser";
import { generateQRDataURL } from "../lib/qrUtils";
import { Zap, Shield, BarChart2, Wifi, CreditCard, MessageSquare, Mail, Type, Link as LinkIcon } from "lucide-react";

const TYPEWRITER_LINES = [
  "Generate QR codes in seconds_",
  "Track every scan in real-time_",
  "Dynamic QR — change destination anytime_",
  "WiFi, vCard, URL, SMS, Email, Text_",
];

function useTypewriter(lines: string[], speed = 50) {
  const [text, setText] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = lines[lineIdx];
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => {
        setText(current.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    } else if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    } else if (deleting && charIdx > 0) {
      const t = setTimeout(() => {
        setText(current.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
      }, speed / 2);
      return () => clearTimeout(t);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setLineIdx((l) => (l + 1) % lines.length);
    }
  }, [charIdx, deleting, lineIdx, lines, speed]);

  return text;
}

const ASCII_LOGO = `
 ██████  ██████  ███████  ██████  ██████   ██████  ███████
██    ██ ██   ██ ██      ██    ██ ██   ██ ██       ██     
██    ██ ██████  ███████ ██    ██ ██████  ██   ███ █████  
██ ▄▄ ██ ██   ██      ██ ██    ██ ██   ██ ██    ██ ██     
 ██████  ██   ██ ███████  ██████  ██   ██  ██████  ███████
    ▀▀                                                     `;

const FEATURES = [
  { icon: LinkIcon, label: "URL / Dynamic URL", desc: "Short redirect links you can update without reprinting" },
  { icon: Wifi, label: "WiFi Credentials", desc: "Tap-to-connect QR codes for your network" },
  { icon: CreditCard, label: "vCard Contact", desc: "Share your contact info instantly" },
  { icon: MessageSquare, label: "SMS / WhatsApp", desc: "Pre-filled messages ready to send" },
  { icon: Mail, label: "Email Composer", desc: "Subject + body pre-populated" },
  { icon: Type, label: "Plain Text", desc: "Any freeform text content" },
];

export default function Index() {
  const { isPro } = useUser();
  const typeText = useTypewriter(TYPEWRITER_LINES);
  const [demoUrl, setDemoUrl] = useState("https://qrforge.app");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    generateQRDataURL(demoUrl || "https://qrforge.app").then(setQrDataUrl);
  }, [demoUrl]);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />

      {/* Hero */}
      <section className="ascii-bg relative border-b border-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <pre className="text-[#00FF41] text-[6px] sm:text-[7px] leading-tight opacity-80 mb-6 hidden sm:block overflow-hidden">
                {ASCII_LOGO}
              </pre>
              <div className="sm:hidden text-[#00FF41] text-4xl font-bold mb-4">
                QR<span className="text-white">Forge</span>
              </div>
              <div className="text-[#555] text-xs mb-2 uppercase tracking-widest">$ forge --mode interactive</div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">
                <span className="text-[#00FF41]">{typeText}</span>
                <span className="blink text-[#00FF41]">|</span>
              </h1>
              <p className="text-[#666] text-sm leading-relaxed mb-8 max-w-md">
                Professional QR code generator with real-time analytics, dynamic redirects, and full style control.
                Free forever for basic use.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link to="/create">
                  <button className="bg-[#00FF41] text-black font-bold text-sm px-6 py-2.5 hover:bg-[#00cc33] transition-colors">
                    CREATE FREE QR
                  </button>
                </Link>
                <Link to="/pricing">
                  <button className="border border-[#1a1a1a] text-[#888] font-bold text-sm px-6 py-2.5 hover:border-[#00FF41] hover:text-[#00FF41] transition-colors">
                    SEE PRICING
                  </button>
                </Link>
              </div>
            </div>

            {/* Right — live demo */}
            <div className="border border-[#1a1a1a] bg-[#050505] p-6">
              <div className="text-[#555] text-xs mb-4">
                <span className="text-[#00FF41]">LIVE DEMO</span>
                <span className="opacity-50"> — try it now</span>
              </div>
              <input
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://your-url.com"
                className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-3 py-2 text-sm text-white placeholder-[#333] transition-colors mb-4"
              />
              <div className="flex justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Preview" className="w-40 h-40 pixelated" style={{ imageRendering: "pixelated" }} />
                ) : (
                  <div className="w-40 h-40 border border-[#1a1a1a] flex items-center justify-center text-[#333] text-xs">
                    enter a URL
                  </div>
                )}
              </div>
              <Link to="/create">
                <div className="text-center text-[#00FF41] text-xs mt-4 hover:underline cursor-pointer">
                  → Customize colors & download
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Ad banner */}
      <AdBanner isPro={isPro} />

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-[#555] text-xs mb-2 uppercase tracking-widest">$ ls --types</div>
        <h2 className="text-xl font-bold mb-8">
          Every QR type you need<span className="text-[#00FF41]">.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.label} className="border border-[#0d0d0d] bg-[#030303] p-4 hover:border-[#1a1a1a] transition-colors group">
              <f.icon size={16} className="text-[#00FF41] mb-3 group-hover:glow-green-text transition-all" />
              <div className="font-bold text-sm mb-1 text-white">{f.label}</div>
              <div className="text-[#444] text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic QR callout */}
      <section className="border-y border-[#0a0a0a] bg-[#030303]">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-[#00FF41] text-xs mb-2 uppercase tracking-widest">Dynamic QR</div>
            <h2 className="text-xl font-bold mb-3">
              Change the destination.<br />Keep the same QR code.
            </h2>
            <p className="text-[#555] text-sm leading-relaxed">
              Dynamic QR codes use a short redirect. Print once, update the URL anytime from your dashboard.
              Every scan is tracked — device, browser, time.
            </p>
          </div>
          <div className="border border-[#1a1a1a] p-4 text-xs text-[#555] space-y-1 bg-black">
            <div><span className="text-[#00FF41]">QR printed on brochure</span> → qrforge.app/q/abc123</div>
            <div className="text-[#333] pl-4">↓ redirect</div>
            <div><span className="text-white">Today:</span> https://old-landing-page.com</div>
            <div className="text-[#333]">— update destination —</div>
            <div><span className="text-white">Tomorrow:</span> https://new-campaign.com</div>
            <div className="text-[#333] pl-4">↑ same QR, different destination</div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 gap-4 text-center">
          {[
            { n: "6", label: "QR Types" },
            { n: "∞", label: "Free Codes" },
            { n: "100%", label: "Open Source" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-[#00FF41]">{s.n}</div>
              <div className="text-[#444] text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pro callout */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-block border border-[#00FF41]/20 bg-[#00FF41]/5 p-8 max-w-xl">
          <Zap size={24} className="text-[#FFB800] mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2">
            Upgrade to Pro<span className="text-[#00FF41]">.</span>
          </h3>
          <p className="text-[#555] text-sm mb-6">
            Unlock analytics, dynamic QR codes, and ad-free experience.
          </p>
          <Link to="/pricing">
            <button className="bg-[#00FF41] text-black font-bold text-sm px-8 py-2.5 hover:bg-[#00cc33] transition-colors">
              VIEW PLANS
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#0a0a0a] py-6 text-center text-[#333] text-xs">
        <span>QRForge</span>
        <span className="mx-2 text-[#1a1a1a]">|</span>
        <Link to="/create"><span className="hover:text-[#555] cursor-pointer transition-colors">Create</span></Link>
        <span className="mx-2 text-[#1a1a1a]">|</span>
        <Link to="/pricing"><span className="hover:text-[#555] cursor-pointer transition-colors">Pricing</span></Link>
        <span className="mx-2 text-[#1a1a1a]">|</span>
        <Link to="/login"><span className="hover:text-[#555] cursor-pointer transition-colors">Login</span></Link>
      </footer>
    </div>
  );
}
