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

export async function generateQuestionDraft(input: {
  topic: string;
  questionType: "multiple-choice" | "true-false" | "open-ended";
  difficulty: "easy" | "medium" | "hard";
  gradeLevel?: string;
}) {
  const catalog = await listLLMModels();
  const model = catalog.data.find(item => item.id === "gpt-5-mini")?.id ?? catalog.data[0]?.id;
  const response = await invokeLLM({
    model,
    maxTokens: 1400,
    messages: [
      {
        role: "system",
        content: "Sen Türkçe eğitim ölçme-değerlendirme uzmanısın. Yalnızca istenen JSON şemasına uyan, yaş düzeyine uygun, tek doğru cevabı olan ve telifli uzun metin içermeyen bir soru üret. Açık uçlu soru için seçenek dizisini boş bırak. Doğru-yanlış için seçenekler Tam doğru olarak ['Doğru','Yanlış'] olmalı.",
      },
      {
        role: "user",
        content: `Konu: ${input.topic}\nSınıf seviyesi: ${input.gradeLevel ?? "genel"}\nSoru türü: ${input.questionType}\nZorluk: ${input.difficulty}\nSoruyu Türkçe üret.`,
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
