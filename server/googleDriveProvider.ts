import { randomUUID } from "node:crypto";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";

export type GoogleDriveMode = "personal" | "workspace";

function config(mode: GoogleDriveMode) {
  const prefix = mode === "workspace" ? "GOOGLE_WORKSPACE_DRIVE" : "GOOGLE_DRIVE";
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`],
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`],
    redirectUri: process.env[`${prefix}_REDIRECT_URI`],
  };
}

export function getGoogleDriveMissingConfig(mode: GoogleDriveMode) {
  const values = config(mode);
  return Object.entries(values).filter(([, value]) => !value?.trim()).map(([key]) => key);
}

export function buildGoogleDriveAuthorizationUrl(mode: GoogleDriveMode, state?: string) {
  const values = config(mode);
  if (getGoogleDriveMissingConfig(mode).length) throw new Error("Google Drive OAuth yapılandırılmadı.");
  const resolvedState = state ?? randomUUID();
  const url = new URL(AUTH_ENDPOINT);
  url.search = new URLSearchParams({ client_id: values.clientId!, redirect_uri: values.redirectUri!, response_type: "code", access_type: "offline", prompt: "consent", scope: DRIVE_SCOPE, state: resolvedState }).toString();
  return { url: url.toString(), state: resolvedState };
}

export async function exchangeGoogleDriveCode(mode: GoogleDriveMode, code: string) {
  const values = config(mode);
  if (getGoogleDriveMissingConfig(mode).length) throw new Error("Google Drive OAuth yapılandırılmadı.");
  const response = await fetch(TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: values.clientId!, client_secret: values.clientSecret!, redirect_uri: values.redirectUri!, grant_type: "authorization_code" }) });
  if (!response.ok) throw new Error("Google Drive OAuth kodu değiştirilemedi.");
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number; token_type?: string }>;
}

export async function createGoogleDriveResumableUpload(input: { mode: GoogleDriveMode; accessToken: string; fileName: string; mimeType: string; sizeBytes: number; folderId?: string }) {
  if (!input.accessToken.trim()) throw new Error("Google Drive erişim belirteci gereklidir.");
  const metadata = { name: input.fileName, ...(input.folderId ? { parents: [input.folderId] } : {}) };
  const response = await fetch(UPLOAD_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": input.mimeType, "X-Upload-Content-Length": String(input.sizeBytes) }, body: JSON.stringify(metadata) });
  if (!response.ok) throw new Error("Google Drive resumable upload oturumu başlatılamadı.");
  return { uploadUrl: response.headers.get("location") ?? "", metadata };
}

export { DRIVE_SCOPE };
