import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

export type ParsedPdfQuestion = {
  sourceNumber: string;
  prompt: string;
  options: string[];
  answer: string | null;
  questionType: "multiple-choice" | "open-ended";
  topicTag: string | null;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  answerMatched: boolean;
  hasEmbeddedImage: boolean;
  embeddedImageDataBase64: string | null;
  embeddedImageUrl: string | null;
  embeddedImageRole: "question" | "answer" | null;
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

function extractBlocks(lines: string[], page: number, answerKey: Map<string, string>, hasEmbeddedImage: boolean, embeddedImageDataBase64: string | null, embeddedImageRole: "question" | "answer" | null): ParsedPdfQuestion[] {
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
    const answerMatched = Boolean(key && compactOptions["ABCD".indexOf(key)]);
    const confidenceScore = compactOptions.length >= 4 ? (answerMatched ? 0.96 : 0.82) : compactOptions.length >= 2 ? (answerMatched ? 0.78 : 0.62) : 0.34;
    const confidence: ParsedPdfQuestion["confidence"] = confidenceScore >= 0.8 ? "high" : confidenceScore >= 0.55 ? "medium" : "low";
    result.push({
      sourceNumber: current.number,
      prompt: normalize(promptLines.join(" ")).slice(0, 5000),
      options: compactOptions,
      answer: key ? compactOptions["ABCD".indexOf(key)] ?? key : null,
      questionType: compactOptions.length >= 2 ? "multiple-choice" : "open-ended",
      topicTag: topicFromHeading(content),
      confidence,
      confidenceScore,
      answerMatched,
      hasEmbeddedImage,
      embeddedImageDataBase64,
      embeddedImageUrl: null,
      embeddedImageRole,
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
  const pageLines: Array<{ page: number; lines: string[]; hasEmbeddedImage: boolean; embeddedImageDataBase64: string | null; embeddedImageRole: "question" | "answer" | null }> = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const operatorList = await page.getOperatorList();
    const hasEmbeddedImage = operatorList.fnArray.some((operator) => operator === OPS.paintImageXObject || operator === OPS.paintXObject);
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
    let embeddedImageDataBase64: string | null = null;
    let embeddedImageRole: "question" | "answer" | null = null;
    if (hasEmbeddedImage) {
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
      const normalized = await sharp(canvas.toBuffer("image/png")).resize(250, 250, { fit: "cover", position: "centre" }).webp({ quality: 82 }).toBuffer();
      embeddedImageDataBase64 = normalized.toString("base64");
      embeddedImageRole = lines.some((line) => ANSWER_KEY.test(line)) ? "answer" : "question";
    }
    pageLines.push({ page: pageNumber, lines, hasEmbeddedImage, embeddedImageDataBase64, embeddedImageRole });
    allLines.push(...lines);
  }
  const answerKey = parseAnswerKey(allLines);
  const questions = pageLines.flatMap(({ page, lines, hasEmbeddedImage, embeddedImageDataBase64, embeddedImageRole }) => extractBlocks(lines, page, answerKey, hasEmbeddedImage, embeddedImageDataBase64, embeddedImageRole));
  return {
    fileName,
    pageCount: document.numPages,
    questions,
    warnings: questions.length === 0 ? ["PDF metin katmanı bulunamadı veya soru numarası deseni eşleşmedi. Taranmış PDF için OCR gerekir."] : answerKey.size === 0 ? ["Cevap anahtarı bulunamadı; tüm doğru cevaplar ön izleme ekranında manuel seçilmelidir."] : [],
  };
}

export type PdfQuestionPairParseResult = PdfQuestionParseResult & {
  answerKeyFileName: string;
  answerKeyCount: number;
  matchedCount: number;
  unmatchedCount: number;
};

async function extractPdfTextLines(buffer: Buffer): Promise<string[]> {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const allLines: string[] = [];
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
    allLines.push(...Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map(item => item.text).join(" ")));
  }
  return allLines.map(cleanLine).filter(Boolean);
}

export function applyAnswerKeyToQuestions(questions: ParsedPdfQuestion[], answerKey: Map<string, string>): ParsedPdfQuestion[] {
  return questions.map(question => {
    const key = answerKey.get(question.sourceNumber) ?? null;
    const optionIndex = key ? "ABCD".indexOf(key) : -1;
    const answer = key && optionIndex >= 0 ? question.options[optionIndex] ?? key : question.answer;
    const answerMatched = Boolean(key && optionIndex >= 0 && question.options[optionIndex]);
    const confidenceScore = answerMatched ? Math.min(0.99, question.confidenceScore + 0.08) : key ? Math.min(question.confidenceScore, 0.58) : question.confidenceScore;
    const confidence: ParsedPdfQuestion["confidence"] = confidenceScore >= 0.8 ? "high" : confidenceScore >= 0.55 ? "medium" : "low";
    return { ...question, answer, answerMatched, confidenceScore, confidence, warning: answerMatched ? null : key ? "Cevap anahtarı bulundu ancak seçeneklerle eşleşmedi; manuel kontrol gerekli." : "Bu soru için cevap anahtarı bulunamadı; manuel cevap seçin." };
  });
}

export async function parsePdfQuestionPair(
  questionBuffer: Buffer,
  questionFileName: string,
  answerKeyBuffer: Buffer,
  answerKeyFileName: string,
): Promise<PdfQuestionPairParseResult> {
  const [questionResult, answerLines] = await Promise.all([
    parsePdfQuestions(questionBuffer, questionFileName),
    extractPdfTextLines(answerKeyBuffer),
  ]);
  const answerKey = parseAnswerKey(answerLines);
  const questions = applyAnswerKeyToQuestions(questionResult.questions, answerKey);
  return {
    ...questionResult,
    questions,
    answerKeyFileName,
    answerKeyCount: answerKey.size,
    matchedCount: questions.filter(question => question.answerMatched).length,
    unmatchedCount: questions.filter(question => !question.answerMatched).length,
    warnings: answerKey.size === 0 ? [...questionResult.warnings, "Ayrı cevap anahtarında numara-harf eşleşmesi bulunamadı."] : questionResult.warnings,
  };
}
