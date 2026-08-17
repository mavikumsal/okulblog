import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

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
