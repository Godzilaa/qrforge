import QRCode from "qrcode";

export interface QRStyle {
  fg: string;
  bg: string;
}

export async function generateQRDataURL(
  content: string,
  style: QRStyle = { fg: "#00FF41", bg: "#000000" }
): Promise<string> {
  if (!content.trim()) return "";
  try {
    return await QRCode.toDataURL(content, {
      type: "image/png",
      width: 300,
      margin: 2,
      color: {
        dark: style.fg,
        light: style.bg,
      },
    });
  } catch {
    return "";
  }
}

export async function generateQRSVG(
  content: string,
  style: QRStyle = { fg: "#00FF41", bg: "#000000" }
): Promise<string> {
  if (!content.trim()) return "";
  try {
    return await QRCode.toString(content, {
      type: "svg",
      width: 300,
      margin: 2,
      color: {
        dark: style.fg,
        light: style.bg,
      },
    });
  } catch {
    return "";
  }
}

export function buildContent(qrType: string, data: Record<string, string>): string {
  switch (qrType) {
    case "url":
      return data.url || "";
    case "wifi":
      return `WIFI:T:${data.encryption || "WPA"};S:${data.ssid || ""};P:${data.password || ""};;`;
    case "vcard":
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.name || ""}\nTEL:${data.phone || ""}\nEMAIL:${data.email || ""}\nORG:${data.company || ""}\nURL:${data.website || ""}\nEND:VCARD`;
    case "text":
      return data.text || "";
    case "email":
      return `mailto:${data.email || ""}?subject=${encodeURIComponent(data.subject || "")}&body=${encodeURIComponent(data.body || "")}`;
    case "sms":
      return `sms:${data.phone || ""}?body=${encodeURIComponent(data.message || "")}`;
    default:
      return "";
  }
}
