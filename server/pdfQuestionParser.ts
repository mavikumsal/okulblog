import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { invokeLLM } from "./_core/llm";

export type AnswerKeyQualityLevel = "good" | "review" | "poor";

export type AnswerKeyQuality = {
  level: AnswerKeyQualityLevel;
  score: number;
  pagesAnalyzed: number;
  detectedPairs: number;
  hasTextLayer: boolean;
  averageContrast: number;
  minWidth: number;
  minHeight: number;
  warnings: string[];
  sequenceGaps: number;
  invalidAnswerMarkers: number;
};

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
  sourcePageImageDataBase64: string | null;
  ocrText: string;
  /** Preserved first OCR extraction used to show later manual edits. */
  ocrSourceText: string;
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

function extractBlocks(lines: string[], page: number, answerKey: Map<string, string>, hasEmbeddedImage: boolean, embeddedImageDataBase64: string | null, embeddedImageRole: "question" | "answer" | null, sourcePageImageDataBase64: string | null): ParsedPdfQuestion[] {
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
      sourcePageImageDataBase64,
      ocrText: content.join(" "),
      ocrSourceText: content.join(" "),
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
  const pageLines: Array<{ page: number; lines: string[]; hasEmbeddedImage: boolean; embeddedImageDataBase64: string | null; embeddedImageRole: "question" | "answer" | null; sourcePageImageDataBase64: string | null }> = [];
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
    const pageViewport = page.getViewport({ scale: 0.7 });
    const pageCanvas = createCanvas(Math.ceil(pageViewport.width), Math.ceil(pageViewport.height));
    await page.render({ canvas: pageCanvas as never, canvasContext: pageCanvas.getContext("2d") as never, viewport: pageViewport }).promise;
    const sourcePageImageDataBase64 = (await sharp(pageCanvas.toBuffer("image/png")).resize(1100, 1500, { fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()).toString("base64");
    if (hasEmbeddedImage) {
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
      const normalized = await sharp(canvas.toBuffer("image/png")).resize(250, 250, { fit: "cover", position: "centre" }).webp({ quality: 82 }).toBuffer();
      embeddedImageDataBase64 = normalized.toString("base64");
      embeddedImageRole = lines.some((line) => ANSWER_KEY.test(line)) ? "answer" : "question";
    }
    pageLines.push({ page: pageNumber, lines, hasEmbeddedImage, embeddedImageDataBase64, embeddedImageRole, sourcePageImageDataBase64 });
    allLines.push(...lines);
  }
  const answerKey = parseAnswerKey(allLines);
  const questions = pageLines.flatMap(({ page, lines, hasEmbeddedImage, embeddedImageDataBase64, embeddedImageRole, sourcePageImageDataBase64 }) => extractBlocks(lines, page, answerKey, hasEmbeddedImage, embeddedImageDataBase64, embeddedImageRole, sourcePageImageDataBase64));
  return {
    fileName,
    pageCount: document.numPages,
    questions,
    warnings: questions.length === 0 ? ["PDF metin katmanı bulunamadı veya soru numarası deseni eşleşmedi. Taranmış PDF için OCR gerekir."] : answerKey.size === 0 ? ["Cevap anahtarı bulunamadı; tüm doğru cevaplar ön izleme ekranında manuel seçilmelidir."] : [],
  };
}

export type PdfQuestionPairParseResult = PdfQuestionParseResult & {
  answerKeyFileName: string;
  answerKeyQuality: AnswerKeyQuality;
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

export function calculateAnswerKeyQuality(input: {
  pagesAnalyzed: number;
  detectedPairs: number;
  hasTextLayer: boolean;
  averageContrast: number;
  minWidth: number;
  minHeight: number;
  sequenceGaps?: number;
  invalidAnswerMarkers?: number;
}): AnswerKeyQuality {
  const warnings: string[] = [];
  const sequenceGaps = input.sequenceGaps ?? 0;
  const invalidAnswerMarkers = input.invalidAnswerMarkers ?? 0;
  if (input.minWidth < 900 || input.minHeight < 1200) warnings.push("Cevap anahtarı görüntü çözünürlüğü düşük; numara ve harfler bulanık olabilir.");
  if (input.averageContrast < 28) warnings.push("Görüntü kontrastı düşük; işaretli cevaplar arka plandan yeterince ayrışmayabilir.");
  if (!input.hasTextLayer) warnings.push("PDF metin katmanı içermiyor; görsel OCR sonucu manuel kontrol edilmelidir.");
  if (input.detectedPairs < 3) warnings.push("En az üç güvenilir numara-harf çifti bulunamadı; cevap anahtarı formatını kontrol edin.");
  if (sequenceGaps > 0) warnings.push(`${sequenceGaps} soru numarası sırası eksik veya kopuk görünüyor; cevap anahtarının tüm sayfalarını kontrol edin.`);
  if (invalidAnswerMarkers > 0) warnings.push(`${invalidAnswerMarkers} A–D dışı cevap işareti bulundu; formatı ve OCR karakterlerini doğrulayın.`);
  const score = Math.max(0, Math.min(100, Math.round(
    (input.minWidth >= 900 ? 25 : 10) +
    (input.minHeight >= 1200 ? 20 : 10) +
    Math.min(25, input.averageContrast / 2) +
    (input.hasTextLayer ? 15 : 5) +
    Math.min(15, input.detectedPairs >= 10 ? 15 : input.detectedPairs * 1.5),
  )));
  return {
    level: score >= 75 && warnings.length === 0 ? "good" : score >= 50 ? "review" : "poor",
    score,
    pagesAnalyzed: input.pagesAnalyzed,
    detectedPairs: input.detectedPairs,
    hasTextLayer: input.hasTextLayer,
    averageContrast: Math.round(input.averageContrast),
    minWidth: input.minWidth,
    minHeight: input.minHeight,
    warnings,
    sequenceGaps,
    invalidAnswerMarkers,
  };
}

async function inspectAnswerKeyQuality(buffer: Buffer, detectedPairs: number, format: { sequenceGaps: number; invalidAnswerMarkers: number }): Promise<AnswerKeyQuality> {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = Math.min(document.numPages, 4);
  const contrasts: number[] = [];
  let minWidth = Number.POSITIVE_INFINITY;
  let minHeight = Number.POSITIVE_INFINITY;
  let hasTextLayer = false;
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const text = await page.getTextContent();
    if (text.items.some((item) => "str" in item && Boolean(item.str?.trim()))) hasTextLayer = true;
    const viewport = page.getViewport({ scale: 1.4 });
    minWidth = Math.min(minWidth, Math.ceil(viewport.width));
    minHeight = Math.min(minHeight, Math.ceil(viewport.height));
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
    const stats = await sharp(canvas.toBuffer("image/png")).stats();
    contrasts.push(stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / Math.max(1, stats.channels.length));
  }
  return calculateAnswerKeyQuality({ pagesAnalyzed: pageCount, detectedPairs, hasTextLayer, averageContrast: contrasts.reduce((sum, value) => sum + value, 0) / Math.max(1, contrasts.length), minWidth: Number.isFinite(minWidth) ? minWidth : 0, minHeight: Number.isFinite(minHeight) ? minHeight : 0 });
}

async function extractAnswerKeyWithVision(buffer: Buffer): Promise<Map<string, string>> {
  try {
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const answers = new Map<string, string>();
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 4); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.4 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
      const image = (await sharp(canvas.toBuffer("image/png")).jpeg({ quality: 82 }).toBuffer()).toString("base64");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Bir eğitim dokümanındaki cevap anahtarını okuyorsun. Yalnızca görselde açıkça görülen soru numarası ve A-D harflerini JSON olarak döndür; tahmin yapma." },
          { role: "user", content: [
            { type: "text", text: "Bu sayfadaki cevap anahtarını çıkar. Görülen her madde için numara ve doğru harfi yaz." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" } },
          ] },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "answer_key",
            strict: true,
            schema: {
              type: "object",
              properties: { answers: { type: "array", items: { type: "object", properties: { number: { type: "string" }, answer: { type: "string", enum: ["A", "B", "C", "D"] } }, required: ["number", "answer"], additionalProperties: false } } },
              required: ["answers"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content;
      const normalizedContent = typeof content === "string" ? content : Array.isArray(content) ? content.map((item: any) => typeof item === "string" ? item : item?.text ?? "").join(" ") : "";
      let parsed: { answers?: Array<{ number: string; answer: string }> } | null = null;
      try {
        parsed = normalizedContent ? JSON.parse(normalizedContent) as { answers?: Array<{ number: string; answer: string }> } : null;
      } catch {
        for (const match of Array.from(normalizedContent.matchAll(/"number"\s*:\s*"(\d{1,3})"\s*,\s*"answer"\s*:\s*"([A-D])"/g))) {
          answers.set(match[1], match[2]);
        }
      }
      for (const item of parsed?.answers ?? []) {
        if (/^\d{1,3}$/.test(item.number) && /^[A-D]$/.test(item.answer)) answers.set(item.number, item.answer);
      }
    }
    // A non-answer-key worksheet can make a vision model emit one coincidental mapping.
    // Require several consistent number-letter pairs before accepting visual OCR output.
    if (answers.size < 3) answers.clear();
    return answers;
  } catch (error) {
    console.warn("[PilotOCR] Görsel cevap anahtarı OCR başarısız:", error instanceof Error ? error.message : error);
    return new Map<string, string>();
  }
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
  let answerKey = parseAnswerKey(answerLines);
  if (answerKey.size === 0) answerKey = await extractAnswerKeyWithVision(answerKeyBuffer);
  const questions = applyAnswerKeyToQuestions(questionResult.questions, answerKey);
  const rawAnswerEntries = answerLines.flatMap(line => Array.from(line.matchAll(/\b(\d{1,3})\s*[-.:)]?\s*([A-ZÇĞİÖŞÜ])/gi)).map(match => ({ number: Number(match[1]), answer: match[2].toUpperCase() })));
  const rawNumbers = Array.from(new Set(rawAnswerEntries.map(entry => entry.number))).sort((a, b) => a - b);
  const sequenceGaps = rawNumbers.length > 1 ? Math.max(0, (rawNumbers[rawNumbers.length - 1] - rawNumbers[0] + 1) - rawNumbers.length) : 0;
  const invalidAnswerMarkers = rawAnswerEntries.filter(entry => !/^[A-D]$/.test(entry.answer)).length;
  const answerKeyQuality = await inspectAnswerKeyQuality(answerKeyBuffer, answerKey.size, { sequenceGaps, invalidAnswerMarkers });
  return {
    ...questionResult,
    questions,
    answerKeyFileName,
    answerKeyQuality,
    answerKeyCount: answerKey.size,
    matchedCount: questions.filter(question => question.answerMatched).length,
    unmatchedCount: questions.filter(question => !question.answerMatched).length,
    warnings: answerKey.size === 0 ? [...questionResult.warnings, "Ayrı cevap anahtarında numara-harf eşleşmesi bulunamadı."] : questionResult.warnings,
  };
}

export async function parseImageQuestionPair(
  questionBuffer: Buffer,
  questionFileName: string,
  answerKeyBuffer: Buffer,
  answerKeyFileName: string,
): Promise<PdfQuestionPairParseResult> {
  const questionImage = (await sharp(questionBuffer).webp({ quality: 82 }).toBuffer()).toString("base64");
  const answerImage = (await sharp(answerKeyBuffer).webp({ quality: 82 }).toBuffer()).toString("base64");
  const [questionResponse, answerResponse] = await Promise.all([
    invokeLLM({
      messages: [
        { role: "system", content: "Bir eğitim sorusu görselini okuyorsun. Yalnızca görselde açıkça görülen soruları, seçenekleri ve soru numaralarını JSON olarak çıkar; metin veya cevap tahmin etme." },
        { role: "user", content: [{ type: "text", text: "Görseldeki çoktan seçmeli soruları çıkar. Her soru için numara, soru metni ve görülen A-D seçeneklerini yaz." }, { type: "image_url", image_url: { url: `data:image/webp;base64,${questionImage}`, detail: "high" } }] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "questions", strict: true, schema: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { number: { type: "string" }, prompt: { type: "string" }, options: { type: "array", items: { type: "string" }, maxItems: 4 } }, required: ["number", "prompt", "options"], additionalProperties: false } } }, required: ["questions"], additionalProperties: false } } },
    }),
    invokeLLM({
      messages: [
        { role: "system", content: "Bir cevap anahtarı görselini okuyorsun. Yalnızca açıkça görülen soru numarası ve A-D harflerini JSON olarak döndür; tahmin yapma." },
        { role: "user", content: [{ type: "text", text: "Görseldeki cevap anahtarını çıkar. Görülen her numara için doğru A-D harfini yaz." }, { type: "image_url", image_url: { url: `data:image/webp;base64,${answerImage}`, detail: "high" } }] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "answer_key", strict: true, schema: { type: "object", properties: { answers: { type: "array", items: { type: "object", properties: { number: { type: "string" }, answer: { type: "string", enum: ["A", "B", "C", "D"] } }, required: ["number", "answer"], additionalProperties: false } } }, required: ["answers"], additionalProperties: false } } },
    }),
  ]);
  const contentOf = (response: any) => { const content = response.choices?.[0]?.message?.content; return typeof content === "string" ? content : Array.isArray(content) ? content.map((item: any) => typeof item === "string" ? item : item?.text ?? "").join(" ") : ""; };
  const readJson = <T,>(value: string): T => { try { return JSON.parse(value) as T; } catch { return {} as T; } };
  const questionData = readJson<{ questions?: Array<{ number: string; prompt: string; options: string[] }> }>(contentOf(questionResponse));
  const answerData = readJson<{ answers?: Array<{ number: string; answer: string }> }>(contentOf(answerResponse));
  const answerKey = new Map<string, string>((answerData.answers ?? []).filter(item => /^\d{1,3}$/.test(item.number) && /^[A-D]$/.test(item.answer)).map(item => [item.number, item.answer]));
  const normalizedPage = (await sharp(questionBuffer).resize(1100, 1500, { fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()).toString("base64");
  const questions: ParsedPdfQuestion[] = (questionData.questions ?? []).filter(item => /^\d{1,3}$/.test(item.number) && item.prompt.trim().length >= 8).map(item => ({
    sourceNumber: item.number,
    prompt: normalize(item.prompt).slice(0, 5000),
    options: item.options.filter(Boolean).slice(0, 4),
    answer: null,
    questionType: item.options.filter(Boolean).length >= 2 ? "multiple-choice" : "open-ended",
    topicTag: null,
    confidence: "medium",
    confidenceScore: 0.68,
    answerMatched: false,
    hasEmbeddedImage: true,
    embeddedImageDataBase64: normalizedPage,
    embeddedImageUrl: null,
    embeddedImageRole: "question",
    sourcePageImageDataBase64: normalizedPage,
    ocrText: `${item.prompt} ${item.options.join(" ")}`.trim(),
    ocrSourceText: `${item.prompt} ${item.options.join(" ")}`.trim(),
    page: 1,
    warning: "Görsel OCR sonucu; manuel kontrol önerilir.",
  }));
  const matchedQuestions = applyAnswerKeyToQuestions(questions, answerKey);
  const answerMeta = await sharp(answerKeyBuffer).metadata();
  const answerStats = await sharp(answerKeyBuffer).stats();
  const contrast = answerStats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / Math.max(1, answerStats.channels.length);
  const rawNumbers = Array.from(answerKey.keys()).map(Number).sort((a, b) => a - b);
  const sequenceGaps = rawNumbers.length > 1 ? Math.max(0, rawNumbers[rawNumbers.length - 1] - rawNumbers[0] + 1 - rawNumbers.length) : 0;
  const answerKeyQuality = calculateAnswerKeyQuality({ pagesAnalyzed: 1, detectedPairs: answerKey.size, hasTextLayer: false, averageContrast: contrast, minWidth: answerMeta.width ?? 0, minHeight: answerMeta.height ?? 0, sequenceGaps, invalidAnswerMarkers: 0 });
  return { fileName: questionFileName, pageCount: 1, questions: matchedQuestions, warnings: matchedQuestions.length ? ["Görsel OCR kullanıldı; düşük güvenli alanları manuel kontrol edin."] : ["Görselde soru bulunamadı."], answerKeyFileName, answerKeyQuality, answerKeyCount: answerKey.size, matchedCount: matchedQuestions.filter(question => question.answerMatched).length, unmatchedCount: matchedQuestions.filter(question => !question.answerMatched).length };
}
