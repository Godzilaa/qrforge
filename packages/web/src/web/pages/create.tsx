import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { AdBanner } from "../components/AdBanner";
import { useUser } from "../hooks/useUser";
import { generateQRDataURL, buildContent } from "../lib/qrUtils";
import { Download, Save, Loader2 } from "lucide-react";

type QRType = "url" | "wifi" | "vcard" | "text" | "email" | "sms" | "dynamic_url";

const QR_TYPES: { id: QRType; label: string; desc: string }[] = [
  { id: "url", label: "URL", desc: "Static website link" },
  { id: "dynamic_url", label: "DYNAMIC", desc: "Trackable redirect" },
  { id: "wifi", label: "WiFi", desc: "Network credentials" },
  { id: "vcard", label: "vCard", desc: "Contact info" },
  { id: "text", label: "Text", desc: "Plain text" },
  { id: "email", label: "Email", desc: "Email composer" },
  { id: "sms", label: "SMS", desc: "Text message" },
];

const DEFAULT_DATA: Record<QRType, Record<string, string>> = {
  url: { url: "" },
  dynamic_url: { url: "" },
  wifi: { ssid: "", password: "", encryption: "WPA" },
  vcard: { name: "", phone: "", email: "", company: "", website: "" },
  text: { text: "" },
  email: { email: "", subject: "", body: "" },
  sms: { phone: "", message: "" },
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[#555] text-[10px] uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-3 py-2 text-sm text-white placeholder-[#333] transition-colors ${className}`}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-3 py-2 text-sm text-white placeholder-[#333] transition-colors resize-none"
    />
  );
}

export default function Create() {
  const { user, isPro } = useUser();
  const [, setLocation] = useLocation();
  const [qrType, setQrType] = useState<QRType>("url");
  const [data, setData] = useState<Record<string, string>>(DEFAULT_DATA.url);
  const [style, setStyle] = useState({ fg: "#00FF41", bg: "#000000" });
  const [label, setLabel] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState("");

  const updateField = (key: string, val: string) => {
    setData((d) => ({ ...d, [key]: val }));
  };

  const handleTypeChange = (t: QRType) => {
    setQrType(t);
    setData(DEFAULT_DATA[t]);
  };

  // Recompute content whenever data/type changes
  useEffect(() => {
    const c = buildContent(qrType === "dynamic_url" ? "url" : qrType, data);
    setContent(c);
  }, [qrType, data]);

  // Regenerate QR preview
  useEffect(() => {
    if (!content) {
      setQrDataUrl("");
      return;
    }
    generateQRDataURL(content, style).then(setQrDataUrl);
  }, [content, style]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${label || qrType}-${Date.now()}.png`;
    a.click();
  }, [qrDataUrl, label, qrType]);

  const handleSave = async () => {
    if (!content && qrType !== "dynamic_url") return;
    setSaving(true);
    try {
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? null,
          qrType,
          label: label || null,
          data,
          style,
          isDynamic: qrType === "dynamic_url",
        }),
      });
      const json = await res.json();
      setSaved(true);
      if (user) {
        setTimeout(() => setLocation(`/dashboard/${json.qr.id}`), 800);
      }
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = !content.trim();

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />
      <AdBanner isPro={isPro} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="text-[#555] text-xs mb-1">$ qrforge --create</div>
          <h1 className="text-xl font-bold">
            Create QR Code<span className="text-[#00FF41]">.</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: form */}
          <div className="space-y-6">
            {/* Type tabs */}
            <div className="border border-[#0d0d0d] p-4 bg-[#030303]">
              <div className="text-[#555] text-[10px] uppercase tracking-widest mb-3">QR Type</div>
              <div className="flex flex-wrap gap-2">
                {QR_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTypeChange(t.id)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      qrType === t.id
                        ? "border-[#00FF41] text-[#00FF41] bg-[#00FF41]/5"
                        : "border-[#1a1a1a] text-[#555] hover:border-[#333] hover:text-[#888]"
                    }`}
                  >
                    {t.label}
                    {t.id === "dynamic_url" && <span className="ml-1 text-[#FFB800] text-[9px]">PRO</span>}
                  </button>
                ))}
              </div>
              {qrType === "dynamic_url" && (
                <p className="text-[#444] text-xs mt-2">
                  Dynamic QR uses a short redirect. You can change the destination URL anytime. Scans are tracked.
                </p>
              )}
            </div>

            {/* Form fields */}
            <div className="border border-[#0d0d0d] p-4 bg-[#030303] space-y-4">
              <div className="text-[#555] text-[10px] uppercase tracking-widest mb-3">Content</div>

              {(qrType === "url" || qrType === "dynamic_url") && (
                <FieldGroup label={qrType === "dynamic_url" ? "Destination URL" : "URL"}>
                  <Input
                    value={data.url || ""}
                    onChange={(v) => updateField("url", v)}
                    placeholder="https://example.com"
                    type="url"
                  />
                </FieldGroup>
              )}

              {qrType === "wifi" && (
                <>
                  <FieldGroup label="Network Name (SSID)">
                    <Input value={data.ssid || ""} onChange={(v) => updateField("ssid", v)} placeholder="MyWiFi" />
                  </FieldGroup>
                  <FieldGroup label="Password">
                    <Input value={data.password || ""} onChange={(v) => updateField("password", v)} placeholder="••••••••" type="password" />
                  </FieldGroup>
                  <FieldGroup label="Security">
                    <select
                      value={data.encryption || "WPA"}
                      onChange={(e) => updateField("encryption", e.target.value)}
                      className="w-full bg-black border border-[#1a1a1a] focus:border-[#00FF41] outline-none px-3 py-2 text-sm text-white transition-colors"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </FieldGroup>
                </>
              )}

              {qrType === "vcard" && (
                <>
                  <FieldGroup label="Full Name">
                    <Input value={data.name || ""} onChange={(v) => updateField("name", v)} placeholder="Jane Doe" />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Phone">
                      <Input value={data.phone || ""} onChange={(v) => updateField("phone", v)} placeholder="+1 555 0000" />
                    </FieldGroup>
                    <FieldGroup label="Email">
                      <Input value={data.email || ""} onChange={(v) => updateField("email", v)} placeholder="jane@example.com" type="email" />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Company">
                      <Input value={data.company || ""} onChange={(v) => updateField("company", v)} placeholder="Acme Inc." />
                    </FieldGroup>
                    <FieldGroup label="Website">
                      <Input value={data.website || ""} onChange={(v) => updateField("website", v)} placeholder="https://..." type="url" />
                    </FieldGroup>
                  </div>
                </>
              )}

              {qrType === "text" && (
                <FieldGroup label="Text">
                  <Textarea value={data.text || ""} onChange={(v) => updateField("text", v)} placeholder="Enter your text..." rows={4} />
                </FieldGroup>
              )}

              {qrType === "email" && (
                <>
                  <FieldGroup label="To Email">
                    <Input value={data.email || ""} onChange={(v) => updateField("email", v)} placeholder="recipient@example.com" type="email" />
                  </FieldGroup>
                  <FieldGroup label="Subject">
                    <Input value={data.subject || ""} onChange={(v) => updateField("subject", v)} placeholder="Hello!" />
                  </FieldGroup>
                  <FieldGroup label="Body">
                    <Textarea value={data.body || ""} onChange={(v) => updateField("body", v)} placeholder="Message body..." rows={3} />
                  </FieldGroup>
                </>
              )}

              {qrType === "sms" && (
                <>
                  <FieldGroup label="Phone Number">
                    <Input value={data.phone || ""} onChange={(v) => updateField("phone", v)} placeholder="+1 555 0000" />
                  </FieldGroup>
                  <FieldGroup label="Message">
                    <Textarea value={data.message || ""} onChange={(v) => updateField("message", v)} placeholder="Your message..." rows={3} />
                  </FieldGroup>
                </>
              )}
            </div>

            {/* Label */}
            <div className="border border-[#0d0d0d] p-4 bg-[#030303]">
              <div className="text-[#555] text-[10px] uppercase tracking-widest mb-3">Label <span className="text-[#333]">(optional)</span></div>
              <Input value={label} onChange={setLabel} placeholder="e.g. Product brochure, Menu QR..." />
            </div>

            {/* Style */}
            <div className="border border-[#0d0d0d] p-4 bg-[#030303]">
              <div className="text-[#555] text-[10px] uppercase tracking-widest mb-3">Colors</div>
              <div className="flex gap-6">
                <div className="space-y-1">
                  <label className="text-[#555] text-[10px]">Foreground</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.fg}
                      onChange={(e) => setStyle((s) => ({ ...s, fg: e.target.value }))}
                      className="w-8 h-8 bg-transparent border border-[#1a1a1a] cursor-pointer p-0.5"
                    />
                    <span className="text-[#555] text-xs">{style.fg}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[#555] text-[10px]">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.bg}
                      onChange={(e) => setStyle((s) => ({ ...s, bg: e.target.value }))}
                      className="w-8 h-8 bg-transparent border border-[#1a1a1a] cursor-pointer p-0.5"
                    />
                    <span className="text-[#555] text-xs">{style.bg}</span>
                  </div>
                </div>
                <button
                  onClick={() => setStyle({ fg: "#00FF41", bg: "#000000" })}
                  className="text-[#333] text-xs hover:text-[#555] transition-colors self-end mb-1"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="space-y-4">
            <div className="border border-[#0d0d0d] p-4 bg-[#030303] sticky top-[70px]">
              <div className="text-[#555] text-[10px] uppercase tracking-widest mb-4">Preview</div>

              <div
                className="flex items-center justify-center p-4 mb-4"
                style={{ background: style.bg, border: "1px solid #0d0d0d" }}
              >
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 border border-[#1a1a1a] flex items-center justify-center text-[#333] text-xs text-center">
                    fill in the<br />form
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  disabled={isEmpty || !qrDataUrl}
                  className="w-full flex items-center justify-center gap-2 border border-[#00FF41]/50 text-[#00FF41] text-xs py-2 hover:bg-[#00FF41]/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Download size={12} />
                  DOWNLOAD PNG
                </button>

                <button
                  onClick={handleSave}
                  disabled={isEmpty || saving || saved}
                  className="w-full flex items-center justify-center gap-2 bg-[#00FF41] text-black font-bold text-xs py-2 hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><Loader2 size={12} className="animate-spin" /> SAVING...</>
                  ) : saved ? (
                    <>✓ SAVED</>
                  ) : (
                    <><Save size={12} /> SAVE TO DASHBOARD</>
                  )}
                </button>
              </div>

              {!user && (
                <p className="text-[#333] text-[10px] mt-3 text-center">
                  <a href="/login" className="text-[#555] hover:text-[#00FF41] transition-colors">Login</a> to track scans
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
