import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowRight, CheckCircle2, FileText, Gamepad2, GraduationCap, Layers3, Newspaper, PlayCircle, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";

const contentTypes = {
  test: { label: "Testler", eyebrow: "Ölçme ve değerlendirme", description: "Sınıf, ders, ünite ve kazanım seçerek uygun testleri keşfedin.", icon: Target, accent: "#e7b354" },
  document: { label: "Dokümanlar", eyebrow: "Düzenli kaynak arşivi", description: "Ders çalışma notlarını ve kaynak dokümanlarını eğitim yoluna göre bulun.", icon: FileText, accent: "#b8ddd4" },
  video: { label: "Videolar", eyebrow: "Odaklı anlatımlar", description: "Konuyu doğru bağlamda anlatan eğitim videolarına ulaşın.", icon: PlayCircle, accent: "#f3c7bd" },
  game: { label: "Oyunlar", eyebrow: "Aktif tekrar deneyimi", description: "Öğrenmeyi oyunlaştırılmış tekrarlarla pekiştirin.", icon: Gamepad2, accent: "#bcd5ee" },
  simulation: { label: "Simülasyonlar", eyebrow: "Görerek ve deneyerek öğren", description: "Dersleri deneyimleyerek anlamak için simülasyonları inceleyin.", icon: Layers3, accent: "#d8c8e8" },
  news: { label: "Haberler", eyebrow: "Eğitimden seçili gündem", description: "Eğitim gündemini kategori ve konu bağlamında takip edin.", icon: Newspaper, accent: "#d6dfad" },
} as const;

type ContentType = keyof typeof contentTypes;
type CategoryNode = { id: number; name: string; level: string; parentId: number | null; categoryType: string; isActive: boolean };

function getTypeFromPath(path: string): ContentType {
  const value = path.split("/").filter(Boolean).at(-1) as ContentType | undefined;
  return value && value in contentTypes ? value : "test";
}

function categoryIdsForSelection(nodes: CategoryNode[], selectedId: number | null) {
  if (!selectedId) return null;
  const ids = new Set<number>([selectedId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

export default function ContentHub() {
  const [, params] = useRoute("/icerik/:type");
  const [location, setLocation] = useLocation();
  const type = getTypeFromPath(params?.type ? `/icerik/${params.type}` : location);
  const config = contentTypes[type];
  const overview = trpc.platform.overview.useQuery();
  const nodes = (overview.data?.educationCategories ?? []) as CategoryNode[];
  const allContent = overview.data?.content ?? [];
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [selectedSchoolLevelId, setSelectedSchoolLevelId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);

  const activeNodes = useMemo(() => nodes.filter(node => node.isActive !== false), [nodes]);
  const roots = useMemo(() => activeNodes.filter(node => node.level === "ana-grup"), [activeNodes]);
  const schoolLevels = useMemo(() => activeNodes.filter(node => node.level === "school-level" && node.parentId === selectedRootId), [activeNodes, selectedRootId]);
  const classes = useMemo(() => activeNodes.filter(node => node.level === "class" && node.parentId === selectedSchoolLevelId), [activeNodes, selectedSchoolLevelId]);
  const subjects = useMemo(() => activeNodes.filter(node => node.level === "subject" && node.parentId === selectedClassId), [activeNodes, selectedClassId]);
  const units = useMemo(() => activeNodes.filter(node => node.level === "unit" && node.parentId === selectedSubjectId), [activeNodes, selectedSubjectId]);
  const outcomes = useMemo(() => activeNodes.filter(node => node.level === "outcome" && node.parentId === selectedUnitId), [activeNodes, selectedUnitId]);

  const selectedLeafId = selectedOutcomeId ?? selectedUnitId ?? selectedSubjectId ?? selectedClassId ?? selectedSchoolLevelId ?? selectedRootId;
  const selectedNodePath = useMemo(() => {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const path: CategoryNode[] = [];
    let current = selectedLeafId ? byId.get(selectedLeafId) : undefined;
    while (current) {
      path.unshift(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return path;
  }, [nodes, selectedLeafId]);

  const filteredContent = useMemo(() => {
    const allowedIds = categoryIdsForSelection(activeNodes, selectedLeafId);
    return allContent.filter(item => {
      const visible = item.status === "published" || item.status === "pending";
      const sameType = item.contentType === type;
      return visible && sameType && (!allowedIds || (item.categoryId ? allowedIds.has(item.categoryId) : false));
    });
  }, [activeNodes, allContent, selectedLeafId, type]);

  const updateUrl = (next: Partial<Record<string, number | null>>) => {
    const values = {
      rootId: selectedRootId,
      schoolLevelId: selectedSchoolLevelId,
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      unitId: selectedUnitId,
      outcomeId: selectedOutcomeId,
      ...next,
    };
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => { if (value) query.set(key, String(value)); });
    setLocation(`/icerik/${type}${query.toString() ? `?${query.toString()}` : ""}`);
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const read = (key: string) => { const value = Number(query.get(key)); return Number.isInteger(value) && value > 0 ? value : null; };
    setSelectedRootId(read("rootId"));
    setSelectedSchoolLevelId(read("schoolLevelId"));
    setSelectedClassId(read("classId"));
    setSelectedSubjectId(read("subjectId"));
    setSelectedUnitId(read("unitId"));
    setSelectedOutcomeId(read("outcomeId"));
  }, [location]);

  const selectValue = (value: number | null) => value ? String(value) : "";
  const handleSelect = (level: string, value: string) => {
    const id = value ? Number(value) : null;
    const reset: Record<string, number | null> = { schoolLevelId: null, classId: null, subjectId: null, unitId: null, outcomeId: null };
    if (level === "root") { setSelectedRootId(id); setSelectedSchoolLevelId(null); setSelectedClassId(null); setSelectedSubjectId(null); setSelectedUnitId(null); setSelectedOutcomeId(null); updateUrl({ rootId: id, ...reset }); return; }
    if (level === "school") { setSelectedSchoolLevelId(id); setSelectedClassId(null); setSelectedSubjectId(null); setSelectedUnitId(null); setSelectedOutcomeId(null); updateUrl({ schoolLevelId: id, classId: null, subjectId: null, unitId: null, outcomeId: null }); return; }
    if (level === "class") { setSelectedClassId(id); setSelectedSubjectId(null); setSelectedUnitId(null); setSelectedOutcomeId(null); updateUrl({ classId: id, subjectId: null, unitId: null, outcomeId: null }); return; }
    if (level === "subject") { setSelectedSubjectId(id); setSelectedUnitId(null); setSelectedOutcomeId(null); updateUrl({ subjectId: id, unitId: null, outcomeId: null }); return; }
    if (level === "unit") { setSelectedUnitId(id); setSelectedOutcomeId(null); updateUrl({ unitId: id, outcomeId: null }); return; }
    setSelectedOutcomeId(id); updateUrl({ outcomeId: id });
  };

  const Icon = config.icon;
  const breadcrumb = selectedNodePath.length ? selectedNodePath.map(node => node.name).join(" → ") : "Tüm eğitim kategorileri";

  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#12304a]">
      <header className="sticky top-0 z-20 border-b border-[#e5ece8] bg-white/95 backdrop-blur-xl">
        <div className="container flex min-h-[68px] flex-wrap items-center justify-between gap-3 py-3">
          <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2 text-left" aria-label="OkulBlog ana sayfa"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap className="h-5 w-5" /></span><span className="text-lg font-bold tracking-[-.06em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></span></button>
          <nav className="flex flex-wrap items-center justify-end gap-1 text-[11px] font-bold text-[#526a69]" aria-label="İçerik navigasyonu">
            {Object.entries(contentTypes).map(([key, item]) => <button type="button" key={key} onClick={() => setLocation(`/icerik/${key}`)} className={`rounded-full px-3 py-2 transition hover:bg-[#f0edff] hover:text-[#5540e8] ${key === type ? "bg-[#f0edff] text-[#5540e8]" : ""}`}>{item.label}</button>)}
            <button type="button" onClick={() => setLocation("/soru-cevap")} className="rounded-full px-3 py-2 transition hover:bg-[#f0edff] hover:text-[#5540e8]">Soru-Cevap</button>
          </nav>
        </div>
      </header>
      <section className="border-b border-[#d7e3df] bg-[#dceee9]">
        <div className="container py-8 sm:py-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.26em] text-[#53706b]">{config.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-[#12304a] sm:text-5xl">{config.label}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#52706b]">{config.description}</p>
            </div>
            <div className="rounded-3xl bg-white/80 p-4 shadow-[0_18px_45px_rgba(18,48,74,.08)]" aria-label="Seçili kategori yolu">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ backgroundColor: config.accent }}><Icon className="h-5 w-5 text-[#12304a]" /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#78918d]">Kategori yolu</p><p className="mt-1 max-w-xs text-sm font-semibold text-[#12304a]">{breadcrumb}</p></div>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-3 rounded-3xl bg-white/70 p-4 shadow-[0_12px_30px_rgba(18,48,74,.05)] sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Ana Grup", roots, selectedRootId, "root"],
              ["Okul Düzeyi", schoolLevels, selectedSchoolLevelId, "school"],
              ["Sınıf", classes, selectedClassId, "class"],
              ["Ders", subjects, selectedSubjectId, "subject"],
              ["Ünite", units, selectedUnitId, "unit"],
              ["Kazanım", outcomes, selectedOutcomeId, "outcome"],
            ].map(([label, options, value, level]) => (
              <label key={String(level)} className="text-xs font-semibold text-[#52706b]">{String(label)}
                <select value={selectValue(value as number | null)} onChange={event => handleSelect(String(level), event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-[#d6e1de] bg-white px-3 text-sm font-medium text-[#12304a] outline-none transition focus:border-[#12304a] focus:ring-4 focus:ring-[#12304a]/10" disabled={String(level) !== "root" && !(options as CategoryNode[]).length}>
                  <option value="">Seçiniz</option>
                  {(options as CategoryNode[]).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-10 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#82918f]">İçerik listesi</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">{breadcrumb} içeriği</h2></div>
          <p className="text-sm text-[#6b7c79]">{filteredContent.length} içerik bulundu</p>
        </div>
        {overview.isLoading ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-10 text-center text-sm text-[#6b7c79]">İçerikler hazırlanıyor…</div> : filteredContent.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredContent.map(item => <article key={item.id} className="group overflow-hidden rounded-3xl border border-[#dfe8e4] bg-white shadow-[0_14px_36px_rgba(18,48,74,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(18,48,74,.12)]">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-40 w-full object-cover" /> : <div className="h-16" style={{ backgroundColor: config.accent }} />}<div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#82918f]">{config.label}</p><h3 className="mt-2 text-lg font-semibold text-[#12304a]">{item.title}</h3>{item.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6b7c79]">{item.summary}</p>}<button type="button" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#12304a] transition hover:gap-3">İçeriği aç <ArrowRight className="h-4 w-4" /></button></div></article>)}</div> : <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-[#7ba99b]" /><h3 className="mt-3 text-lg font-semibold">Bu filtrede henüz içerik yok</h3><p className="mt-2 text-sm text-[#6b7c79]">Başka bir sınıf, ders veya ünite seçerek tekrar deneyin.</p></div>}
      </section>
    </main>
  );
}
