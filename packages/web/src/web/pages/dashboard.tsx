import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "../components/Navbar";
import { AdBanner } from "../components/AdBanner";
import { useUser } from "../hooks/useUser";
import { generateQRDataURL } from "../lib/qrUtils";
import { Plus, Trash2, BarChart2, Loader2, ExternalLink } from "lucide-react";

interface QRCode {
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

function QRCard({
  qr,
  onDelete,
}: {
  qr: QRCode;
  onDelete: (id: number) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const style = qr.styleConfig ? JSON.parse(qr.styleConfig) : { fg: "#00FF41", bg: "#000000" };
    generateQRDataURL(qr.content, style).then(setQrDataUrl);
  }, [qr.content, qr.styleConfig]);

  const handleDelete = async () => {
    if (!confirm("Delete this QR code?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/qr/${qr.id}`, { method: "DELETE" });
      onDelete(qr.id);
    } finally {
      setDeleting(false);
    }
  };

  const formattedDate = qr.createdAt
    ? new Date(qr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="border border-[#0d0d0d] bg-[#030303] p-4 hover:border-[#1a1a1a] transition-colors group">
      <div className="flex gap-4">
        {/* QR thumbnail */}
        <div className="flex-shrink-0">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR" className="w-16 h-16" />
          ) : (
            <div className="w-16 h-16 bg-black border border-[#0d0d0d] flex items-center justify-center">
              <Loader2 size={12} className="animate-spin text-[#333]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-sm truncate">
                {qr.label || <span className="text-[#333]">Unlabeled QR</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 border ${qr.type === "dynamic" ? "border-[#FFB800]/30 text-[#FFB800]" : "border-[#1a1a1a] text-[#555]"}`}>
                  {qr.type.toUpperCase()}
                </span>
                <span className="text-[9px] text-[#333] px-1.5 py-0.5 border border-[#0d0d0d]">
                  {qr.qrType.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[#00FF41] font-bold text-sm">{qr.scanCount}</div>
              <div className="text-[#333] text-[9px]">scans</div>
            </div>
          </div>

          <div className="text-[#333] text-[10px] mt-2 truncate">
            {qr.destinationUrl || qr.content}
          </div>

          <div className="text-[#222] text-[10px] mt-1">{formattedDate}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[#0a0a0a]">
        <Link to={`/dashboard/${qr.id}`}>
          <button className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#00FF41] transition-colors px-2 py-1 border border-[#0d0d0d] hover:border-[#00FF41]/30">
            <BarChart2 size={10} />
            ANALYTICS
          </button>
        </Link>
        {qr.destinationUrl && (
          <a href={qr.destinationUrl} target="_blank" rel="noopener noreferrer">
            <button className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#888] transition-colors px-2 py-1 border border-[#0d0d0d]">
              <ExternalLink size={10} />
              VISIT
            </button>
          </a>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 text-[10px] text-[#333] hover:text-[#ff3333] transition-colors px-2 py-1 border border-[#0d0d0d] hover:border-[#ff3333]/30 ml-auto"
        >
          {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
          DELETE
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isPro, refresh } = useUser();
  const [, setLocation] = useLocation();
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle post-checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      window.history.replaceState({}, "", "/dashboard");
      refresh();
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    fetch(`/api/qr?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => setQrCodes(d.qrCodes || []))
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const handleDelete = (id: number) => {
    setQrCodes((prev) => prev.filter((q) => q.id !== id));
  };

  const totalScans = qrCodes.reduce((s, q) => s + (q.scanCount || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar />
      <AdBanner isPro={isPro} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[#555] text-xs mb-1">$ qrforge --dashboard</div>
            <h1 className="text-xl font-bold">
              Dashboard<span className="text-[#00FF41]">.</span>
            </h1>
            {user && <p className="text-[#444] text-xs mt-1">{user.email}</p>}
          </div>
          <Link to="/create">
            <button className="flex items-center gap-2 bg-[#00FF41] text-black font-bold text-xs px-4 py-2 hover:bg-[#00cc33] transition-colors">
              <Plus size={12} />
              NEW QR
            </button>
          </Link>
        </div>

        {/* Stats */}
        {!loading && qrCodes.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total QR Codes", value: qrCodes.length },
              { label: "Total Scans", value: totalScans },
              { label: "Dynamic Codes", value: qrCodes.filter((q) => q.type === "dynamic").length },
            ].map((s) => (
              <div key={s.label} className="border border-[#0d0d0d] bg-[#030303] p-3">
                <div className="text-xl font-bold text-[#00FF41]">{s.value}</div>
                <div className="text-[#333] text-[10px] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-2 text-[#555] text-sm py-12 justify-center">
            <Loader2 size={14} className="animate-spin" />
            LOADING...
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="border border-[#0d0d0d] bg-[#030303] p-12 text-center">
            <div className="text-[#333] text-4xl mb-4">[ ]</div>
            <div className="text-[#555] text-sm mb-1">No QR codes yet.</div>
            <div className="text-[#333] text-xs mb-6">Create your first one.</div>
            <Link to="/create">
              <button className="bg-[#00FF41] text-black font-bold text-xs px-6 py-2 hover:bg-[#00cc33] transition-colors">
                CREATE QR CODE
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {qrCodes.map((qr) => (
              <QRCard key={qr.id} qr={qr} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
