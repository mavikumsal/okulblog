import "dotenv/config";
import express from "express";
import multer from "multer";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { aggregateContentViewDaily, listRetryableDocumentImportHistory } from "../db";
import { retryFailedDocumentImport, documentImportRetryPolicy } from "../documentImportRetry";
import { storagePut } from "../storage";
import { buildSitemap, robotsTxt, sitemapXml } from "../seo";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
  const questionImportMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/trpc/files.stageQuestionPdfUpload", upload.single("file"), async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Bu işlem için admin yetkisi gerekir." });
      const fileName = String(req.query.fileName ?? "question-import.pdf").trim();
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 255) || "question-import.pdf";
      const mimeType = String(req.file?.mimetype ?? req.headers["content-type"] ?? "application/pdf").split(";")[0].toLowerCase();
      if (!questionImportMimeTypes.has(mimeType)) return res.status(415).json({ error: "Yalnızca PDF, JPEG, PNG veya WebP yüklenebilir." });
      const buffer = req.file?.buffer ?? (Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? ""));
      if (!buffer.length) return res.status(400).json({ error: "Yüklenen dosya boş." });
      if (buffer.byteLength > 20 * 1024 * 1024) return res.status(413).json({ error: "Dosya en fazla 20 MB olabilir." });
      const stored = await storagePut(`okulblog/${user.id}/question-import-staging/${safeName}`, buffer, mimeType);
      return res.json({ fileName, storageKey: stored.key, publicUrl: stored.url, sizeBytes: buffer.byteLength, mimeType });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "PDF staging yüklemesi başarısız." });
    }
  });
  app.post("/api/scheduled/aggregateContentViews", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const result = await aggregateContentViewDaily();
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Aggregation failed", timestamp: new Date().toISOString() });
    }
  });
  app.get("/robots.txt", (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    res.type("text/plain").send(robotsTxt(origin));
  });
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get("host")}`;
      const entries = await buildSitemap(origin);
      res.type("application/xml").send(sitemapXml(entries));
    } catch (error) {
      res.status(500).type("text/plain").send(error instanceof Error ? error.message : "Sitemap oluşturulamadı.");
    }
  });
  app.post("/api/scheduled/retryDocumentImports", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const candidates = await listRetryableDocumentImportHistory(20, documentImportRetryPolicy.maxAttempts);
      const results = [];
      for (const history of candidates) results.push(await retryFailedDocumentImport(history));
      return res.json({ ok: true, checked: candidates.length, results, policy: documentImportRetryPolicy });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Document retry failed", timestamp: new Date().toISOString() });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
