import { ChevronRight, GraduationCap, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";

const faqItems = [
  { question: "Üyelik zorunlu mu?", answer: "İçerikleri keşfetmek için üyelik zorunlu değildir. Soru-Cevap alanına yazmak ve kişisel ilerlemenizi takip etmek için üye olabilirsiniz." },
  { question: "Ders içeriklerini nasıl bulabilirim?", answer: "Dersleri Keşfet kartından bir eğitim kategorisi seçin; ardından Testler, Dokümanlar, Videolar ve diğer içerik türleri arasından filtre uygulayın." },
  { question: "Öğretmenler içerik ekleyebilir mi?", answer: "Yetkisi açılmış öğretmen ve moderatörler, Admin tarafından belirlenen modüller üzerinden içerik ve soru üretebilir." },
  { question: "Bir sorun veya öneriyi nereye iletebilirim?", answer: "Soru-Cevap alanını veya Destek menüsündeki iletişim kanalını kullanarak bize ulaşabilirsiniz." },
];

export default function FAQ() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.toLocaleLowerCase("tr-TR").trim();
  const filteredItems = useMemo(
    () => faqItems.filter(item => `${item.question} ${item.answer}`.toLocaleLowerCase("tr-TR").includes(normalizedQuery)),
    [normalizedQuery],
  );

  return (
    <main className="min-h-screen bg-[#f8f9fc] text-[#111827]">
      <header className="border-b border-[#e7e9ee] bg-white/90 backdrop-blur">
        <div className="container flex h-[74px] items-center justify-between gap-4">
          <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2.5 text-left" aria-label="OkulBlog ana sayfa">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f9f9a] text-white shadow-[0_9px_20px_rgba(15,159,154,.22)]"><GraduationCap size={21} /></span>
            <span className="text-[21px] font-bold tracking-[-.06em] text-[#06172c]">okul<span className="font-serif text-[#7c3aed]">blog</span></span>
          </button>
          <button type="button" onClick={() => setLocation("/")} className="rounded-xl px-4 py-2 text-sm font-bold text-[#52636d] transition hover:bg-[#effaf7] hover:text-[#0f817d]">Ana sayfaya dön</button>
        </div>
      </header>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="text-[11px] font-black uppercase tracking-[.25em] text-[#5540e8]">Yardım merkezi</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.05em] text-[#111827] sm:text-[40px]">Sıkça sorulan sorular</h1>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">OkulBlog’u kullanmaya başlarken en çok merak edilen kısa cevaplar.</p>
        </div>

        <div className="mx-auto mt-9 max-w-[640px]">
          <label className="relative block">
            <span className="sr-only">SSS içinde ara</span>
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9aa0]" aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Sorularda ara..." className="h-12 w-full rounded-2xl border border-[#e1e3e8] bg-white pl-11 pr-4 text-sm font-medium text-[#17354d] shadow-[0_4px_14px_rgba(23,53,77,.03)] outline-none transition focus:border-[#5540e8] focus:ring-2 focus:ring-[#5540e8]/20" />
          </label>

          <div className="mt-4 space-y-2.5">
            {filteredItems.map(item => (
              <details key={item.question} className="group rounded-2xl border border-[#e1e3e8] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(23,53,77,.03)] transition hover:border-[#cfd4dc] sm:px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 pr-0 font-bold text-[#17354d] outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-[#5540e8] focus-visible:ring-offset-2">
                  <span>{item.question}</span>
                  <ChevronRight className="shrink-0 text-[#52636d] transition-transform duration-200 group-open:rotate-90" size={18} aria-hidden="true" />
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#71838b]">{item.answer}</p>
              </details>
            ))}
            {!filteredItems.length && <p className="rounded-2xl border border-dashed border-[#d8dfe0] bg-white p-5 text-center text-sm text-[#71838b]">Aramanızla eşleşen bir soru bulunamadı.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

export { faqItems };
