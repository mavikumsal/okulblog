import { createHash } from "node:crypto";

const DEFAULT_ENDPOINT = "https://storage.bunnycdn.com";

function cleanName(fileName: string) {
  const base = fileName.split(/[\\/]/).pop() || "document.pdf";
  return base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "document.pdf";
}

export async function uploadToBunnyStorage(input: {
  data: Buffer;
  fileName: string;
  mimeType: string;
  storageZone: string;
  accessKey: string;
  pullZoneUrl: string;
  endpoint?: string;
}) {
  const safeName = cleanName(input.fileName);
  const providerAssetId = `okulblog/documents/${Date.now()}-${safeName}`;
  const endpoint = (input.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");
  const url = `${endpoint}/${encodeURIComponent(input.storageZone)}/${providerAssetId.split("/").map(encodeURIComponent).join("/")}`;
  const checksum = createHash("sha256").update(input.data).digest("hex").toUpperCase();
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: input.accessKey,
      "Content-Type": input.mimeType,
      Checksum: checksum,
    },
    body: new Uint8Array(input.data),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Bunny Storage upload failed (${response.status}): ${message.slice(0, 300)}`);
  }
  return {
    providerAssetId,
    publicUrl: `${input.pullZoneUrl.replace(/\/+$/, "")}/${providerAssetId}`,
    fileName: safeName,
    checksum,
  };
}

export function validateRemoteDocumentUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Yalnızca HTTPS doküman bağlantılarına izin verilir.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") {
    throw new Error("Özel ağ adreslerine izin verilmiyor.");
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host) || host === "::1") {
    throw new Error("Özel ağ adreslerine izin verilmiyor.");
  }
  return url;
}

export const ALLOWED_REMOTE_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
