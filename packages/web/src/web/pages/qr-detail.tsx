import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { AdBanner } from "../components/AdBanner";
import { useUser } from "../hooks/useUser";
import { generateQRDataURL } from "../lib/qrUtils";
import { ArrowLeft, Download, Loader2, Save, Lock, Zap } from "lucide-react";

interface Analytics {
  total: number;
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  recentScans: { scannedAt: string; deviceType: string; browser: string }[];
  locked: boolean;
}

interface QRData {
  id: number;
  type: string;
  qrType: string;
  label: string | null;
  content: string;
  shortCode: string | null;
  destinationUrl: string | null;
  styleConfig: string | null;
  scanCount: number;
  createdAt: string;
}

function AsciiBar({ value, max, width = 20 }: { value: number; max: number; width?: number }) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return (
    <span className="text-[#00FF41] text-xs font-mono">
      {"█".repeat(filled)}
      <span className="text-[#1a1a1a]">{"░".repeat(width - filled)}</span>
    </span>
  );
}

function LockedAnalytics() {
  return (
    <div className="border border-[#FFB800]/20 bg-[#FFB800]/5 rounded-none p-8 text-center space-y-4">
      <div className="flex justify-center">
        <Lock size={24} className="text-[#FFB800]" />
      </div>
      <div>
        <div className="text-[#FFB800] font-bold text-sm mb-1">Analytics locked</div>
        <div className="text-[#555] text-xs">Device breakdown, scan timeline &amp; recent activity require Pro.</div>
      </div>
      <Link to="/pricing">
        <button className="inline-flex items-center gap-2 bg-[#FFB800] text-black font-bold text-xs px-5 py-2 hover:bg-[#e6a700] transition-colors">
          <Zap size={11} />
          UPGRADE TO PRO
        </button>
      </Link>
    </div>
  );
}

export default function QRDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isPro } = useUser();
  const [, setLocation] = useLocation();

  const [qr, setQr] = useState<QRData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [newDest, setNewDest] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    const numId = parseInt(id);
    Promise.all([
      fetch(`/api/qr/${numId}`).then((r) => r.json()),
      fetch(`/api/qr/${numId}/analytics?userId=${user.id}`).then((r) => r.json()),
    ]).then(([qrData, analyticsData]) => {
      const q: QRData = qrData.qr;
      setQr(q);
      setNewDest(q.destinationUrl || "");
      setNewLabel(q.label || "");
      setAnalytics(analyticsData);
      const style = q.styleConfig ? JSON.parse(q.styleConfig) : { fg: "#00FF41", bg: "#000000" };
      generateQRDataURL(q.content, style).then(setQrDataUrl);
    }).finally(() => setLoading(false));
  }, [id, user, setLocation]);

  const handleDownload = () => {
    if (!qrDataUrl || !qr) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${qr.label || qr.id}.png`;
    a.click();
  };

  const handleSave = async () => {
    if (!qr || !user) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationUrl: newDest, label: newLabel, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save.");
        return;
      }
      setQr((prev) => prev ? { ...prev, ...data.qr } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const maxTimeline = analytics ? Math.max(...(analytics.timeline.map((t) => t.count) || [1]), 1) : 1;
  const maxDevice   = analytics ? Math.max(...(analytics.devices.map((d) => d.value) || [1]), 1) : 1;
  const maxBrowser  = analytics ? Math.max(...(analytics.browsers.map((b) => b.value) || [1]), 1) : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono">
        <Navbar />
        <div className="flex items-center justify-center h-96 gap-2 text-[#555]">
          <Loader2 size={14} className="animate-spin" />
          LOADING...
        </div>
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="min-h-screen bg-black text-white font-mono">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-[#555]">
          <div className="text-4xl text-[#1a1a1a]">404</div>
          <div className="text-sm">QR code not found.</div>
          <Link to="/dashboard">
            <button className="text-xs text-[#00FF41] hover:underline">← BACK TO DASHBOARD</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />
      <AdBanner isPro={isPro} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard">
            <button className="text-[#555] hover:text-[#00FF41] transition-colors">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <div className="text-[#555] text-xs mb-0.5">$ qrforge --detail {qr.id}</div>
            <h1 className="text-xl font-bold truncate">
              {qr.label || "Unlabeled QR"}
              <span className="text-[#00FF41]">.</span>
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-[9px] px-2 py-1 border ${qr.type === "dynamic" ? "border-[#FFB800]/30 text-[#FFB800]" : "border-[#1a1a1a] text-[#555]"}`}>
              {qr.type.toUpperCase()}
            </span>
            <span className="text-[9px] px-2 py-1 border border-[#0d0d0d] text-[#555]">
              {qr.qrType.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left: QR + edit */}
          <div className="space-y-4">
            <div className="border border-[#0d0d0d] bg-[#030303] p-4">
              <div className="text-[#555] text-[10px] uppercase tracking-widest mb-3">QR Code</div>
              <div className="flex justify-center mb-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 border border-[#0d0d0d] flex items-center justify-center">
                    <Loader2 size={12} className="animate-spin text-[#333]" />
                  </div>
                )}
              </div>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 border border-[#00FF41]/30 text-[#00FF41] text-xs py-2 hover:bg-[#00FF41]/5 transition-colors"
              >
                <Download size={12} />
                DOWNLOAD PNG
              </button>
            </div>

            {/* Edit */}
            <div className="border border-[#0d0d0d] bg-[#030303] p-4 space-y-3">
              <div className="text-[#555] text-[10px] uppercase tracking-widest">Edit</div>

              <div className="space-y-1">
                <label className="text-[#333] text-[10px]">Label</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-2 py-1.5 text-xs text-white placeholder-[#333] transition-colors"
                  placeholder="Label..."
                />
              </div>

              {qr.type === "dynamic" && (
                <div className="space-y-1">
                  <label className="text-[#333] text-[10px] flex items-center gap-1">
                    Destination URL
                    {!isPro && <span className="text-[#FFB800] text-[9px]">(Pro)</span>}
                  </label>
                  <input
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value)}
                    disabled={!isPro}
                    className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-2 py-1.5 text-xs text-white placeholder-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder="https://new-destination.com"
                    type="url"
                  />
                  {!isPro && (
                    <p className="text-[#444] text-[10px]">
                      <Link to="/pricing"><span className="text-[#FFB800] hover:underline cursor-pointer">Upgrade to Pro</span></Link> to edit redirect URL.
                    </p>
                  )}
                </div>
              )}

              {saveError && (
                <div className="text-[#ff4444] text-[10px] border border-[#ff4444]/20 px-2 py-1.5">
                  {saveError}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="w-full flex items-center justify-center gap-1.5 bg-[#00FF41] text-black font-bold text-xs py-2 hover:bg-[#00cc33] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                {saved ? "SAVED ✓" : saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>

            {/* Meta */}
            <div className="border border-[#0d0d0d] bg-[#030303] p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#444]">Created</span>
                <span className="text-[#777]">
                  {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              {qr.shortCode && (
                <div className="flex justify-between">
                  <span className="text-[#444]">Short code</span>
                  <span className="text-[#00FF41] text-[10px]">/q/{qr.shortCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#444]">Total scans</span>
                <span className="text-[#00FF41] font-bold">{analytics?.total ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#444]">Plan</span>
                <span className={isPro ? "text-[#00FF41]" : "text-[#555]"}>{isPro ? "PRO" : "FREE"}</span>
              </div>
            </div>
          </div>

          {/* Right: Analytics */}
          <div className="space-y-4">
            {analytics?.locked ? (
              <LockedAnalytics />
            ) : (
              <>
                {/* Scan timeline */}
                <div className="border border-[#0d0d0d] bg-[#030303] p-4">
                  <div className="text-[#555] text-[10px] uppercase tracking-widest mb-4">
                    Scans — Last 30 Days
                  </div>
                  {analytics && analytics.timeline.length > 0 ? (
                    <div className="space-y-1">
                      {analytics.timeline.slice(-14).map((t) => (
                        <div key={t.date} className="flex items-center gap-3">
                          <span className="text-[#333] text-[10px] w-20 flex-shrink-0">{t.date.slice(5)}</span>
                          <AsciiBar value={t.count} max={maxTimeline} width={24} />
                          <span className="text-[#555] text-[10px]">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#333] text-xs py-4 text-center">No scans yet.</div>
                  )}
                </div>

                {/* Device + Browser */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-[#0d0d0d] bg-[#030303] p-4">
                    <div className="text-[#555] text-[10px] uppercase tracking-widest mb-4">Devices</div>
                    {analytics && analytics.devices.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.devices.map((d) => (
                          <div key={d.name}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-[#888] capitalize">{d.name}</span>
                              <span className="text-[#555]">{d.value}</span>
                            </div>
                            <AsciiBar value={d.value} max={maxDevice} width={16} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#333] text-xs">No data.</div>
                    )}
                  </div>

                  <div className="border border-[#0d0d0d] bg-[#030303] p-4">
                    <div className="text-[#555] text-[10px] uppercase tracking-widest mb-4">Browsers</div>
                    {analytics && analytics.browsers.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.browsers.map((b) => (
                          <div key={b.name}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-[#888]">{b.name}</span>
                              <span className="text-[#555]">{b.value}</span>
                            </div>
                            <AsciiBar value={b.value} max={maxBrowser} width={16} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#333] text-xs">No data.</div>
                    )}
                  </div>
                </div>

                {/* Recent scans */}
                {analytics && analytics.recentScans.length > 0 && (
                  <div className="border border-[#0d0d0d] bg-[#030303] p-4">
                    <div className="text-[#555] text-[10px] uppercase tracking-widest mb-4">Recent Scans</div>
                    <div className="space-y-1">
                      {analytics.recentScans.slice(0, 10).map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-[10px] py-1 border-b border-[#050505] last:border-0">
                          <span className="text-[#333] w-24 flex-shrink-0">
                            {s.scannedAt ? new Date(s.scannedAt).toLocaleString() : "—"}
                          </span>
                          <span className="text-[#555] capitalize">{s.deviceType || "—"}</span>
                          <span className="text-[#444]">{s.browser || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
