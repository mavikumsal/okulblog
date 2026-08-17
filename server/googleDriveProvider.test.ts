import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildGoogleDriveAuthorizationUrl, createGoogleDriveResumableUpload, exchangeGoogleDriveCode, getGoogleDriveMissingConfig } from "./googleDriveProvider";

describe("Google Drive provider sözleşmesi", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_REDIRECT_URI;
  });

  it("eksik OAuth yapılandırmasını raporlar ve URL üretimini reddeder", () => {
    expect(getGoogleDriveMissingConfig("personal")).toEqual(["clientId", "clientSecret", "redirectUri"]);
    expect(() => buildGoogleDriveAuthorizationUrl("personal")).toThrow("yapılandırılmadı");
  });

  it("kişisel Drive OAuth URL’sini üretir", () => {
    process.env.GOOGLE_DRIVE_CLIENT_ID = "client-id";
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_DRIVE_REDIRECT_URI = "https://okulblog.example.com/oauth/google-drive";
    const result = buildGoogleDriveAuthorizationUrl("personal", "state-123456");
    expect(result.state).toBe("state-123456");
    expect(result.url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(result.url).toContain("client_id=client-id");
  });

  it("OAuth code exchange ve resumable upload session sözleşmesini kullanır", async () => {
    process.env.GOOGLE_DRIVE_CLIENT_ID = "client-id";
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_DRIVE_REDIRECT_URI = "https://okulblog.example.com/oauth/google-drive";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", refresh_token: "refresh", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { location: "https://upload.example.com/session" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(exchangeGoogleDriveCode("personal", "auth-code")).resolves.toMatchObject({ access_token: "token", refresh_token: "refresh" });
    await expect(createGoogleDriveResumableUpload({ mode: "personal", accessToken: "token", fileName: "lesson.pdf", mimeType: "application/pdf", sizeBytes: 42, folderId: "folder-1" })).resolves.toEqual({ uploadUrl: "https://upload.example.com/session", metadata: { name: "lesson.pdf", parents: ["folder-1"] } });
    expect(fetchMock).toHaveBeenLastCalledWith("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", expect.objectContaining({ method: "POST" }));
  });
});
