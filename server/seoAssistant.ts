import { invokeLLM } from "./_core/llm";

export type SeoSuggestion = { description: string; keywords: string[]; focusKeyphrase: string };

function cleanSuggestion(value: unknown): SeoSuggestion {
  const raw = (value ?? {}) as Record<string, unknown>;
  const description = String(raw.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map(item => String(item).trim().toLocaleLowerCase("tr-TR")).filter(Boolean).slice(0, 12)
    : [];
  const focusKeyphrase = String(raw.focusKeyphrase ?? keywords[0] ?? "").trim().slice(0, 80);
  return { description, keywords, focusKeyphrase };
}

export async function generateSeoSuggestion(input: { title: string; content: string; provider: "openai" | "gemini"; model?: string }): Promise<SeoSuggestion> {
  const response = await invokeLLM({
    model: input.model || (input.provider === "gemini" ? "gemini-2.5-flash" : "gpt-5-mini"),
    messages: [
      { role: "system", content: "Türkçe eğitim platformu için SEO editörüsün. Yalnızca verilen JSON şemasına uygun çıktı üret. Meta açıklaması 140-160 karakter, anahtar kelimeler özgün ve içerikle doğrudan ilgili olsun." },
      { role: "user", content: `Başlık: ${input.title}\nİçerik:\n${input.content.slice(0, 12000)}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            description: { type: "string", description: "140-160 karakter Türkçe meta açıklaması" },
            keywords: { type: "array", items: { type: "string" }, maxItems: 12 },
            focusKeyphrase: { type: "string", description: "Ana odak anahtar kelime öbeği" },
          },
          required: ["description", "keywords", "focusKeyphrase"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  const suggestion = cleanSuggestion(parsed);
  if (!suggestion.description) throw new Error("AI geçerli bir meta açıklaması üretemedi.");
  return suggestion;
}
