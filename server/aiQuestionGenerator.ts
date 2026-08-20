import { z } from "zod";
import { invokeLLM, listLLMModels } from "./_core/llm";

export const generatedQuestionSchema = z.object({
  questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
  prompt: z.string().min(12).max(1500),
  options: z.array(z.string().min(1).max(300)).max(5),
  answer: z.string().min(1).max(800),
  explanation: z.string().min(1).max(1200),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export type AiProvider = "openai" | "gemini";

const providerDefaults: Record<AiProvider, { model: string; prefixes: string[] }> = {
  openai: { model: "gpt-5-mini", prefixes: ["gpt-"] },
  gemini: { model: "gemini-3-flash-preview", prefixes: ["gemini-"] },
};

export async function generateQuestionDraft(input: {
  topic: string;
  questionType: "multiple-choice" | "true-false" | "open-ended";
  difficulty: "easy" | "medium" | "hard";
  gradeLevel?: string;
  provider?: AiProvider;
  model?: string;
  promptTemplate?: string;
  sourceContext?: string;
}) {
  const provider = input.provider ?? "openai";
  const defaults = providerDefaults[provider];
  const catalog = await listLLMModels();
  const available = catalog.data.filter(item => defaults.prefixes.some(prefix => item.id.startsWith(prefix)));
  const model = available.find(item => item.id === input.model)?.id
    ?? available.find(item => item.id === defaults.model)?.id
    ?? available[0]?.id
    ?? defaults.model;
  const response = await invokeLLM({
    model,
    maxTokens: 1400,
    messages: [
      {
        role: "system",
        content: input.promptTemplate?.trim() || "Sen Türkçe eğitim ölçme-değerlendirme uzmanısın. Yalnızca istenen JSON şemasına uyan, yaş düzeyine uygun, tek doğru cevabı olan ve telifli uzun metin içermeyen bir soru üret. Açık uçlu soru için seçenek dizisini boş bırak. Doğru-yanlış için seçenekler Tam doğru olarak ['Doğru','Yanlış'] olmalı.",
      },
      {
        role: "user",
        content: `Konu: ${input.topic}\nSınıf seviyesi: ${input.gradeLevel ?? "genel"}\nSoru türü: ${input.questionType}\nZorluk: ${input.difficulty}\n${input.sourceContext ? `Kaynak PDF/görsel OCR bağlamı:\n${input.sourceContext.slice(0, 12000)}\n` : ""}Soruyu Türkçe üret.`,
      },
    ],
    outputSchema: {
      name: "education_question_draft",
      strict: true,
      schema: {
        type: "object",
        properties: {
          questionType: { type: "string", enum: ["multiple-choice", "true-false", "open-ended"] },
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["questionType", "prompt", "options", "answer", "explanation"],
        additionalProperties: false,
      },
    },
  });
  const content = response.choices[0]?.message.content;
  const json = typeof content === "string" ? content : content?.filter(part => part.type === "text").map(part => part.text).join("");
  if (!json) throw new Error("Yapay zekâ boş yanıt döndürdü.");
  return generatedQuestionSchema.parse(JSON.parse(json));
}
