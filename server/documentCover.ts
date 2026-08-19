import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfText(buffer: Buffer, maxPages = 12, maxChars = 14000) {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = Math.min(document.numPages, maxPages);
  const chunks: string[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    chunks.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
    if (chunks.join("\\n").length >= maxChars) break;
  }
  return chunks.join("\\n").slice(0, maxChars).trim();
}

export async function renderPdfPages(buffer: Buffer, maxPages = 40) {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = Math.min(document.numPages, maxPages);
  const pages: Buffer[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = 700;
    const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
    pages.push(await sharp(canvas.toBuffer("image/png")).webp({ quality: 78 }).toBuffer());
  }
  return { pageCount: document.numPages, pages };
}

export async function renderPdfCover(buffer: Buffer) {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await document.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const targetWidth = 900;
  const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
  return sharp(canvas.toBuffer("image/png"))
    .resize(900, 1200, { fit: "contain", background: { r: 248, g: 248, b: 243, alpha: 1 } })
    .webp({ quality: 84 })
    .toBuffer();
}
