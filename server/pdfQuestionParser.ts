import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type ParsedPdfQuestion = {
  sourceNumber: string;
  prompt: string;
  options: string[];
  answer: string | null;
  questionType: "multiple-choice" | "open-ended";
  topicTag: string | null;
  confidence: "high" | "medium" | "low";
  page: number;
  warning: string | null;
};

export type PdfQuestionParseResult = {
  fileName: string;
  pageCount: number;
  questions: ParsedPdfQuestion[];
  warnings: string[];
};

const QUESTION_START = /^(\d{1,3})[.)]\s+(.*)$/;
const OPTION_START = /^([A-D])[.)]\s+(.*)$/i;
const ANSWER_KEY = /(?:cevap\s+anahtar[ıi]|yanıt\s+anahtar[ıi])\s*:?/i;
const NOISE = /^(adı|soyadı|ilkokul1\.com|www\.|sayfa\s+\d+)/i;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
}

function cleanLine(value: string): string {
  return normalize(value).replace(/^ilkokul1\.com$/i, "");
}

function topicFromHeading(lines: string[]): string | null {
  const heading = lines.find((line) => line.length >= 4 && !NOISE.test(line) && !QUESTION_START.test(line));
  return heading ? heading.slice(0, 180) : null;
}

function parseAnswerKey(lines: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const keyIndex = lines.findIndex((line) => ANSWER_KEY.test(line));
  if (keyIndex < 0) return result;
  const tail = lines.slice(keyIndex).join(" ");
  for (const match of Array.from(tail.matchAll(/(\d{1,3})\s*[-.:)]?\s*([A-D])/gi))) {
    result.set(match[1], match[2].toUpperCase());
  }
  return result;
}

function extractBlocks(lines: string[], page: number, answerKey: Map<string, string>): ParsedPdfQuestion[] {
  const result: ParsedPdfQuestion[] = [];
  let current: { number: string; page: number; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const content = current.lines.filter(Boolean);
    const options: string[] = [];
    const promptLines: string[] = [];
    for (const line of content) {
      const option = line.match(OPTION_START);
      if (option) options["ABCD".indexOf(option[1].toUpperCase())] = option[2];
      else promptLines.push(line);
    }
    const compactOptions = options.filter(Boolean).slice(0, 4);
    const key = answerKey.get(current.number) ?? null;
    const confidence: ParsedPdfQuestion["confidence"] = compactOptions.length >= 2 ? "medium" : "low";
    result.push({
      sourceNumber: current.number,
      prompt: normalize(promptLines.join(" ")).slice(0, 5000),
      options: compactOptions,
      answer: key ? compactOptions["ABCD".indexOf(key)] ?? key : null,
      questionType: compactOptions.length >= 2 ? "multiple-choice" : "open-ended",
      topicTag: topicFromHeading(content),
      confidence,
      page: current.page,
      warning: compactOptions.length < 2 ? "A–D seçenekleri otomatik bulunamadı; soru türünü ve cevabı kontrol edin." : key ? null : "Cevap anahtarı bulunamadı; doğru cevabı seçin.",
    });
    current = null;
  };
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line || NOISE.test(line)) continue;
    const start = line.match(QUESTION_START);
    if (start) {
      flush();
      current = { number: start[1], page, lines: [start[2]] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return result.filter((question) => question.prompt.length >= 8);
}

export async function parsePdfQuestions(buffer: Buffer, fileName: string): Promise<PdfQuestionParseResult> {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const allLines: string[] = [];
  const pageLines: Array<{ page: number; lines: string[] }> = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const grouped = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = Number(item.transform?.[4] ?? 0);
      const y = Math.round(Number(item.transform?.[5] ?? 0) / 2) * 2;
      const row = grouped.get(y) ?? [];
      row.push({ x, text: item.str });
      grouped.set(y, row);
    }
    const lines = Array.from(grouped.entries()).sort((a: [number, Array<{ x: number; text: string }>], b: [number, Array<{ x: number; text: string }>]) => b[0] - a[0]).map((entry: [number, Array<{ x: number; text: string }>]) => entry[1].sort((a: { x: number; text: string }, b: { x: number; text: string }) => a.x - b.x).map((item: { x: number; text: string }) => item.text).join(" "));
    pageLines.push({ page: pageNumber, lines });
    allLines.push(...lines);
  }
  const answerKey = parseAnswerKey(allLines);
  const questions = pageLines.flatMap(({ page, lines }) => extractBlocks(lines, page, answerKey));
  return {
    fileName,
    pageCount: document.numPages,
    questions,
    warnings: questions.length === 0 ? ["PDF metin katmanı bulunamadı veya soru numarası deseni eşleşmedi. Taranmış PDF için OCR gerekir."] : answerKey.size === 0 ? ["Cevap anahtarı bulunamadı; tüm doğru cevaplar ön izleme ekranında manuel seçilmelidir."] : [],
  };
}
