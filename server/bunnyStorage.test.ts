import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadToBunnyStorage, validateRemoteDocumentUrl } from "./bunnyStorage";

describe("Bunny Storage helper", () => {
  afterEach(() => vi.restoreAllMocks());

  it("yalnızca HTTPS ve public host kabul eder", () => {
    expect(() => validateRemoteDocumentUrl("http://example.com/a.pdf")).toThrow();
    expect(() => validateRemoteDocumentUrl("https://localhost/a.pdf")).toThrow();
    expect(validateRemoteDocumentUrl("https://example.com/a.pdf").hostname).toBe("example.com");
  });

  it("binary PUT isteğinde AccessKey, checksum ve CDN URL üretir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await uploadToBunnyStorage({
      data: Buffer.from("pdf"),
      fileName: "örnek belge.pdf",
      mimeType: "application/pdf",
      storageZone: "zone",
      accessKey: "secret",
      pullZoneUrl: "https://cdn.example.com",
    });
    expect(result.providerAssetId).toMatch(/^okulblog\/documents\//);
    expect(result.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/okulblog\/documents\//);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("storage.bunnycdn.com/zone/okulblog/documents/"),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ AccessKey: "secret", "Content-Type": "application/pdf" }),
      }),
    );
  });
});
