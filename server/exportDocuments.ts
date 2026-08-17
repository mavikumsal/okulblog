export type ExportQuestion = {
  prompt: string;
  options?: string[];
  answer?: string;
  explanation?: string;
};

function plain(value: string | undefined | null) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function pdfEscape(value: string) {
  return plain(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
}

function wrap(value: string, width = 88) {
  const words = value.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > width && line) { lines.push(line); line = word; } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function buildPdfDocument(title: string, questions: ExportQuestion[]) {
  const lines: string[] = [title, "", `Soru sayısı: ${questions.length}`, ""];
  questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${plain(question.prompt)}`);
    (question.options ?? []).forEach((option, optionIndex) => lines.push(`   ${String.fromCharCode(65 + optionIndex)}) ${plain(option)}`));
    if (question.answer) lines.push(`   Cevap: ${plain(question.answer)}`);
    if (question.explanation) lines.push(`   Açıklama: ${plain(question.explanation)}`);
    lines.push("");
  });
  const content = ["BT", "/F1 11 Tf", "50 800 Td", ...lines.flatMap(line => wrap(line).map(item => `(${pdfEscape(item)}) Tj 0 -16 Td`)), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, "utf8"); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export function buildWordDocument(title: string, questions: ExportQuestion[]) {
  const body = questions.map((question, index) => `<section><h2>${index + 1}. ${escapeHtml(plain(question.prompt))}</h2>${(question.options ?? []).map((option, optionIndex) => `<p>${String.fromCharCode(65 + optionIndex)}) ${escapeHtml(plain(option))}</p>`).join("")}${question.answer ? `<p><strong>Cevap:</strong> ${escapeHtml(plain(question.answer))}</p>` : ""}${question.explanation ? `<p><strong>Açıklama:</strong> ${escapeHtml(plain(question.explanation))}</p>` : ""}</section>`).join("");
  return Buffer.from(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><p>Soru sayısı: ${questions.length}</p>${body}</body></html>`, "utf8");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

export function buildExportFile(format: "pdf" | "doc", title: string, questions: ExportQuestion[]) {
  return format === "pdf" ? { buffer: buildPdfDocument(title, questions), mimeType: "application/pdf", extension: "pdf" } : { buffer: buildWordDocument(title, questions), mimeType: "application/msword", extension: "doc" };
}
