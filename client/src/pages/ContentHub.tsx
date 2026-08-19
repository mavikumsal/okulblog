import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowRight, BookOpen, BookMarked, CheckCircle2, ChevronDown, ChevronRight, FileText, Gamepad2, GraduationCap, Layers3, LayoutGrid, LibraryBig, Newspaper, PlayCircle, Search, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";

export const contentTypes = {
  test: { label: "Testler", eyebrow: "Ölçme ve değerlendirme", description: "Admin tarafından oluşturulan eğitim kategorilerindeki testleri keşfedin.", icon: Target, accent: "#e7b354" },
  document: { label: "Dokümanlar", eyebrow: "Düzenli kaynak arşivi", description: "Admin’in yayınladığı kategori ve kaynak dokümanlarını inceleyin.", icon: FileText, accent: "#b8ddd4" },
  video: { label: "Videolar", eyebrow: "Odaklı anlatımlar", description: "Admin tarafından yapılandırılan eğitim kategorilerindeki videoları bulun.", icon: PlayCircle, accent: "#f3c7bd" },
  game: { label: "Oyunlar", eyebrow: "Aktif tekrar deneyimi", description: "Admin’in oluşturduğu eğitim kategorileriyle eşleşen oyunları keşfedin.", icon: Gamepad2, accent: "#bcd5ee" },
  simulation: { label: "Simülasyonlar", eyebrow: "Görerek ve deneyerek öğren", description: "Yayınlanmış simülasyonları yalnızca Admin kategori yapısı içinde görün.", icon: Layers3, accent: "#d8c8e8" },
  news: { label: "Haberler", eyebrow: "Eğitimden seçili gündem", description: "OkulBlog gündemini blog yazıları ve güncel duyurularla takip edin.", icon: Newspaper, accent: "#d6dfad" },
} as const;

type ContentType = keyof typeof contentTypes;
export type CategoryNode = { id: number; name: string; level: string; parentId: number | null; categoryType: string; sortOrder?: number | null; isActive: boolean };

export function categoryPathForNode(categoryId: number | null | undefined, nodes: CategoryNode[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const path: CategoryNode[] = [];
  let current = categoryId ? byId.get(categoryId) : undefined;
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function classGroupForName(name: string | null | undefined) {
  const match = name?.match(/^(\d+)\.\s*Sınıf/i);
  const grade = match ? Number(match[1]) : 0;
  if (grade >= 1 && grade <= 4) return { key: "elementary" as const, label: "İlkokul · 1–4. sınıflar", icon: "book" as const, classes: "border-[#b8ddd4] bg-[#eff9f5] text-[#155d55]", accent: "#38a98d" };
  if (grade >= 5 && grade <= 8) return { key: "middle" as const, label: "Ortaokul · 5–8. sınıflar", icon: "layers" as const, classes: "border-[#bcd5ee] bg-[#eef6ff] text-[#24567b]", accent: "#3d88d8" };
  if (grade >= 9 && grade <= 12) return { key: "high" as const, label: "Lise · 9–12. sınıflar", icon: "graduation" as const, classes: "border-[#d8c8e8] bg-[#f7f0ff] text-[#60447a]", accent: "#8e5bc7" };
  return { key: "general" as const, label: "Eğitim kategorisi", icon: "target" as const, classes: "border-[#e7b354] bg-[#fff8e8] text-[#7b4d0e]", accent: "#d79b2b" };
}

export function categoryIdsForSelection(nodes: CategoryNode[], selectedId: number | null) {
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

export function findClassNode(nodes: CategoryNode[], className: string | null) {
  if (!className) return undefined;
  const normalized = className.trim().toLocaleLowerCase("tr-TR");
  return nodes.find(node => node.level === "class" && node.name.trim().toLocaleLowerCase("tr-TR") === normalized);
}

export function filterContentByClass<T extends { categoryId?: number | null }>(items: T[], nodes: CategoryNode[], className: string | null) {
  if (!className) return items;
  const classNode = findClassNode(nodes, className);
  if (!classNode) return items;
  const categoryIds = categoryIdsForSelection(nodes, classNode.id);
  return categoryIds ? items.filter(item => item.categoryId !== null && item.categoryId !== undefined && categoryIds.has(item.categoryId)) : items;
}

export function getSubjectNodesForClass(nodes: CategoryNode[], className: string | null) {
  if (!className) return [];
  const classNode = findClassNode(nodes, className);
  if (!classNode) return [];
  return nodes.filter(node => node.level === "subject" && node.parentId === classNode.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
}

export function filterContentBySubject<T extends { categoryId?: number | null }>(items: T[], nodes: CategoryNode[], subjectId: number | null) {
  if (!subjectId) return items;
  const categoryIds = categoryIdsForSelection(nodes, subjectId);
  return categoryIds ? items.filter(item => item.categoryId !== null && item.categoryId !== undefined && categoryIds.has(item.categoryId)) : items;
}

export function buildClassBreadcrumb(className: string | null, subjectName?: string | null) {
  return ["Ana Sayfa", "Eğitim", ...(className ? [className] : []), ...(subjectName ? [subjectName] : [])];
}

export const quickContentTypes: ContentType[] = ["test", "document", "video", "simulation", "game", "news"];

export function buildContentTypeUrl(contentType: ContentType, className: string | null, subjectId?: number | null) {
  const params = new URLSearchParams();
  if (className) params.set("class", className);
  if (subjectId) params.set("subject", String(subjectId));
  const query = params.toString();
  return `/icerik/${contentType}${query ? `?${query}` : ""}`;
}

type ContentItem = { id: number; title: string; summary?: string | null; coverImageUrl?: string | null; categoryId?: number | null; contentType: string; status: string };

export function getTypeFromPath(path: string): ContentType {
  const value = path.split("/").filter(Boolean).at(-1) as ContentType | undefined;
  return value && value in contentTypes ? value : "test";
}

export const NEWS_PAGE_SIZE = 6;

export function filterDocumentItems(items: ContentItem[], searchTerm: string, categoryNameById: Map<number, string>) {
  const normalized = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return items;
  return items.filter(item => [item.title, item.summary ?? "", categoryNameById.get(item.categoryId ?? 0) ?? ""].some(value => value.toLocaleLowerCase("tr-TR").includes(normalized)));
}

export function paginateItems<T>(items: T[], page: number, pageSize = NEWS_PAGE_SIZE) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((currentPage - 1) * safePageSize, currentPage * safePageSize), currentPage, totalPages };
}

export function filterCategoryTreeNodes(nodes: CategoryNode[], searchTerm: string) {
  const normalized = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return nodes;
  const byId = new Map(nodes.map(node => [node.id, node]));
  const childrenByParent = new Map<number, CategoryNode[]>();
  nodes.forEach(node => {
    if (node.parentId !== null) childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node]);
  });
  const visibleIds = new Set<number>();
  const addAncestors = (node: CategoryNode) => {
    let current: CategoryNode | undefined = node;
    while (current) {
      visibleIds.add(current.id);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
  };
  const addDescendants = (node: CategoryNode) => {
    (childrenByParent.get(node.id) ?? []).forEach(child => {
      if (!visibleIds.has(child.id)) {
        visibleIds.add(child.id);
        addDescendants(child);
      }
    });
  };
  nodes.filter(node => node.name.trim().toLocaleLowerCase("tr-TR").includes(normalized)).forEach(node => {
    addAncestors(node);
    addDescendants(node);
  });
  return nodes.filter(node => visibleIds.has(node.id));
}

function CategoryTree({ nodes, contentByCategory, onOutcomeOpen }: { nodes: CategoryNode[]; contentByCategory: Map<number, number>; onOutcomeOpen?: (id: number) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(() => {
    const fallback = nodes.filter(node => node.level === "ana-grup").map(node => node.id);
    const stored = window.localStorage.getItem("okulblog:category-tree-open");
    if (!stored) return new Set(fallback);
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? new Set(parsed.filter((id): id is number => typeof id === "number" && nodes.some(node => node.id === id))) : new Set(fallback);
    } catch {
      return new Set(fallback);
    }
  });
  const [lastVisitedId, setLastVisitedId] = useState<number | null>(() => {
    const value = window.localStorage.getItem("okulblog:last-category");
    return value ? Number(value) : null;
  });
  const visibleNodes = useMemo(() => filterCategoryTreeNodes(nodes, searchTerm), [nodes, searchTerm]);
  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, CategoryNode[]>();
    visibleNodes.forEach(node => map.set(node.parentId, [...(map.get(node.parentId) ?? []), node]));
    map.forEach(children => children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id));
    return map;
  }, [visibleNodes]);
  const expandableIds = useMemo(() => visibleNodes.filter(node => (childrenByParent.get(node.id) ?? []).length > 0).map(node => node.id), [childrenByParent, visibleNodes]);
  const allExpanded = expandableIds.length > 0 && expandableIds.every(id => openIds.has(id));
  const toggle = (id: number) => setOpenIds(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const visit = (id: number) => { setLastVisitedId(id); window.localStorage.setItem("okulblog:last-category", String(id)); };
  const renderBranch = (node: CategoryNode, depth = 0): ReactElement => {
    const children = childrenByParent.get(node.id) ?? [];
    const contentCount = contentByCategory.get(node.id) ?? 0;
    const isOpen = openIds.has(node.id);
    const isLastVisited = lastVisitedId === node.id;
    return <div key={node.id} className={depth ? "ml-4 border-l border-[#dbe7e2] pl-4 sm:ml-6 sm:pl-5" : ""}>
      <div role="button" tabIndex={0} onClick={() => node.level === "outcome" && onOutcomeOpen ? onOutcomeOpen(node.id) : visit(node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); node.level === "outcome" && onOutcomeOpen ? onOutcomeOpen(node.id) : visit(node.id); } }} className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 shadow-[0_8px_22px_rgba(18,48,74,.04)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8] ${isLastVisited ? "border-[#d7ae4d] bg-[#fff9e9] ring-2 ring-[#f0d98b]/40" : "border-[#e1eae6] bg-white"}`}>
        {children.length > 0 ? <button type="button" onClick={event => { event.stopPropagation(); toggle(node.id); }} aria-expanded={isOpen} aria-controls={`category-children-${node.id}`} aria-label={`${node.name} kategorisini ${isOpen ? "kapat" : "aç"}`} className={`flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-extrabold shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8] sm:min-w-[68px] ${isOpen ? "border-[#5540e8] bg-[#5540e8] text-white shadow-[0_6px_16px_rgba(85,64,232,.28)]" : "border-[#d1e0da] bg-[#eef7f2] text-[#315f57] hover:border-[#5540e8] hover:bg-[#f0edff] hover:text-[#5540e8]"}`}>{isOpen ? <ChevronDown className="h-4 w-4" strokeWidth={3} /> : <ChevronRight className="h-4 w-4" strokeWidth={3} />}<span className="sr-only sm:not-sr-only">{isOpen ? "Kapat" : "Aç"}</span></button> : <span className="h-10 w-10 shrink-0" />}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#12304a]">{node.name}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#82918f]">{node.level === "ana-grup" ? "Ana grup" : node.level === "school-level" ? "Okul düzeyi" : node.level === "class" ? "Sınıf" : node.level === "subject" ? "Ders" : node.level === "unit" ? "Ünite" : "Kazanım"}{children.length > 0 && <span className={`rounded-full px-1.5 py-0.5 tracking-normal ${isOpen ? "bg-[#e9e5ff] text-[#5540e8]" : "bg-[#f1f5f2] text-[#78908a]"}`}>{isOpen ? "Açık" : "Kapalı"}</span>}</p></div>
        <span className="shrink-0 rounded-full bg-[#f3f7f4] px-2.5 py-1 text-[10px] font-bold text-[#5c8279]">{contentCount} içerik</span>
      </div>
      {children.length > 0 && isOpen && <div id={`category-children-${node.id}`} className="mt-2 space-y-2">{children.map(child => renderBranch(child, depth + 1))}</div>}
    </div>;
  };
  const roots = childrenByParent.get(null) ?? [];
  useEffect(() => { window.localStorage.setItem("okulblog:category-tree-open", JSON.stringify(Array.from(openIds))); }, [openIds]);
  useEffect(() => { if (lastVisitedId && !nodes.some(node => node.id === lastVisitedId)) { setLastVisitedId(null); window.localStorage.removeItem("okulblog:last-category"); } }, [lastVisitedId, nodes]);
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const byId = new Map(visibleNodes.map(node => [node.id, node]));
    setOpenIds(previous => {
      const next = new Set(previous);
      visibleNodes.filter(node => node.name.toLocaleLowerCase("tr-TR").includes(searchTerm.trim().toLocaleLowerCase("tr-TR"))).forEach(node => {
        let parent = node.parentId === null ? undefined : byId.get(node.parentId);
        while (parent) {
          next.add(parent.id);
          parent = parent.parentId === null ? undefined : byId.get(parent.parentId);
        }
      });
      return next;
    });
  }, [searchTerm, visibleNodes]);
  return roots.length ? <div><div className="sticky top-[72px] z-10 -mx-1 mb-3 flex flex-col gap-2 rounded-2xl border border-[#e4e0ff] bg-[#f7f6f1]/95 px-3 py-2 shadow-[0_8px_20px_rgba(18,48,74,.06)] backdrop-blur-md sm:flex-row sm:items-center md:static md:flex-row md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-0"><p className="text-xs text-[#71838b] sm:flex-1">Son ziyaret edilen kategori vurgulanır.</p><label className="relative flex min-h-11 min-w-0 items-center sm:w-44"><Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#82918f]" aria-hidden="true" /><input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Ders veya ünite ara" aria-label="Ders veya ünite ara" className="h-11 w-full rounded-xl border border-[#dfe8e4] bg-white pl-9 pr-3 text-sm text-[#12304a] outline-none placeholder:text-[#9aa9a6] focus:border-[#5540e8] focus:ring-2 focus:ring-[#5540e8]/20" /></label><button type="button" aria-label={allExpanded ? "Tüm kategorileri kapat" : "Tüm kategorileri aç"} onClick={() => setOpenIds(previous => allExpanded ? new Set() : new Set(expandableIds))} className="min-h-11 shrink-0 self-end rounded-xl border border-[#d6cdfc] bg-white px-3.5 py-2 text-xs font-extrabold text-[#5540e8] shadow-sm transition hover:border-[#5540e8] hover:bg-[#f0edff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8] active:scale-[.98] sm:self-auto">{allExpanded ? "Tümünü Kapat" : "Tümünü Aç"}</button></div><div className="space-y-3">{roots.map(root => renderBranch(root))}</div></div> : <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-8 text-center text-sm text-[#6b7c79]">{searchTerm ? "Aramanızla eşleşen ders veya ünite bulunamadı." : "Admin panelinde henüz aktif eğitim kategorisi oluşturulmamış."}</div>;
}

export default function ContentHub() {
  const [, params] = useRoute("/icerik/:type");
  const [location, setLocation] = useLocation();
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentView, setDocumentView] = useState<"shelf" | "grid">("shelf");
  const type = getTypeFromPath(params?.type ? `/icerik/${params.type}` : location);
  const config = contentTypes[type];
  const overview = trpc.platform.overview.useQuery(undefined, { refetchOnWindowFocus: true, staleTime: 0 });
  const nodes = ((overview.data?.educationCategories ?? []) as CategoryNode[]).filter(node => node.isActive !== false);
  const isNews = type === "news";
  const queryCandidates = [window.location.search, location, window.location.href];
  const querySource = queryCandidates.find(candidate => candidate.includes("class=") || candidate.includes("subject=")) ?? (window.location.search || location);
  const query = new URL(querySource, window.location.origin).searchParams;
  const requestedClass = query.get("class")?.trim() || null;
  const requestedSubjectId = Number(query.get("subject"));
  const showAllTypes = query.get("contentType") === "all";
  const selectedClassNode = findClassNode(nodes, requestedClass);
  const subjectNodes = useMemo(() => getSubjectNodesForClass(nodes, requestedClass), [nodes, requestedClass]);
  const selectedSubjectNode = Number.isFinite(requestedSubjectId) && requestedSubjectId > 0 ? subjectNodes.find(node => node.id === requestedSubjectId) : undefined;
  const baseContent = ((overview.data?.content ?? []) as ContentItem[]).filter(item => (item.status === "published" || item.status === "pending") && (showAllTypes ? !isNews : item.contentType === type) && (isNews || item.categoryId));
  const content = filterContentBySubject(filterContentByClass(baseContent, nodes, requestedClass), nodes, selectedSubjectNode?.id ?? null);
  const contentByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    content.forEach(item => { if (item.categoryId) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1); });
    return counts;
  }, [content]);
  const categoryNameById = useMemo(() => new Map(nodes.map(node => [node.id, node.name])), [nodes]);
  const filteredContent = type === "document" ? filterDocumentItems(content, documentSearch, categoryNameById) : content;
  const requestedPage = Number(query.get("page") ?? 1);
  const newsPagination = paginateItems(content, Number.isFinite(requestedPage) ? requestedPage : 1);
  const visibleContent = isNews ? newsPagination.items : filteredContent;
  const Icon = config.icon;
  const classBreadcrumbNodes = selectedSubjectNode ? categoryPathForNode(selectedSubjectNode.id, nodes) : selectedClassNode ? categoryPathForNode(selectedClassNode.id, nodes) : [];
  const classGroup = classGroupForName(selectedClassNode?.name);
  const ClassGroupIcon = classGroup.icon === "book" ? BookOpen : classGroup.icon === "layers" ? Layers3 : classGroup.icon === "graduation" ? GraduationCap : Target;
  const classPageLinks = quickContentTypes;
  const breadcrumbHref = (node: CategoryNode) => {
    const path = categoryPathForNode(node.id, nodes);
    const classNode = path.find(item => item.level === "class");
    const subjectNode = path.find(item => item.level === "subject");
    const params = new URLSearchParams();
    if (classNode) params.set("class", classNode.name);
    if (subjectNode) params.set("subject", String(subjectNode.id));
    const queryString = params.toString();
    return `/icerik/${type}${queryString ? `?${queryString}` : ""}`;
  };

  return <main className="min-h-screen bg-[#f7f6f1] text-[#12304a]">
    <header className="sticky top-0 z-20 border-b border-[#e5ece8] bg-white/95 backdrop-blur-xl"><div className="container flex min-h-[68px] flex-wrap items-center justify-between gap-3 py-3">
      <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2 text-left" aria-label="OkulBlog ana sayfa"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap className="h-5 w-5" /></span><span className="text-lg font-bold tracking-[-.06em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></span></button>
      <nav className="flex flex-wrap items-center justify-end gap-1 text-[11px] font-bold text-[#526a69]" aria-label="İçerik navigasyonu">{Object.entries(contentTypes).map(([key, item]) => <button type="button" key={key} onClick={() => setLocation(`/icerik/${key}`)} className={`rounded-full px-3 py-2 transition hover:bg-[#f0edff] hover:text-[#5540e8] ${key === type ? "bg-[#f0edff] text-[#5540e8]" : ""}`}>{item.label}</button>)}<button type="button" onClick={() => setLocation("/soru-cevap")} className="rounded-full px-3 py-2 transition hover:bg-[#f0edff] hover:text-[#5540e8]">Soru-Cevap</button></nav>
    </div></header>
    <section className="border-b border-[#d7e3df] bg-[#dceee9]"><div className="container py-8 sm:py-12"><div className="flex flex-wrap items-start justify-between gap-6"><div className="max-w-3xl"><nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6c8580]"><button type="button" onClick={() => setLocation("/")} className="transition hover:text-[#5540e8]">Ana Sayfa</button>{classBreadcrumbNodes.map((node, index) => <span key={node.id} className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-[#a7b8b2]" aria-hidden="true" /><button type="button" onClick={() => setLocation(breadcrumbHref(node))} aria-current={index === classBreadcrumbNodes.length - 1 ? "page" : undefined} className={index === classBreadcrumbNodes.length - 1 ? "font-extrabold text-[#5540e8]" : "transition hover:text-[#5540e8]"}>{node.name}</button></span>)}</nav>{selectedClassNode && <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${classGroup.classes}`}><ClassGroupIcon className="h-4 w-4" aria-hidden="true" />{classGroup.label}</div>}<p className="text-[10px] font-bold uppercase tracking-[.26em] text-[#53706b]">{showAllTypes ? "Sınıf içerik merkezi" : config.eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-[#12304a] sm:text-5xl">{selectedClassNode ? `${selectedClassNode.name} · ${showAllTypes ? "Tüm İçerikler" : config.label}` : showAllTypes ? "Tüm İçerikler" : config.label}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#52706b]">{showAllTypes ? "Seçtiğiniz sınıfa ait test, doküman, video ve diğer içerikleri birlikte keşfedin." : config.description}{selectedClassNode ? ` ${selectedClassNode.name} sınıfına ait içerikleri ve dersleri keşfedin.` : ""}</p>{selectedClassNode && !isNews && <div className="mt-6 flex flex-wrap gap-2" aria-label="İçerik türü hızlı filtreleri">{classPageLinks.map(contentType => <button type="button" key={contentType} aria-pressed={contentType === type} onClick={() => setLocation(buildContentTypeUrl(contentType, selectedClassNode.name, selectedSubjectNode?.id))} className={`rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8] ${contentType === type ? "border-[#5540e8] bg-[#5540e8] text-white" : "border-white/80 bg-white/80 text-[#526a69] hover:border-[#bdb3f4] hover:text-[#5540e8]"}`}>{contentTypes[contentType].label}</button>)}</div>}</div><div className="rounded-3xl bg-white/80 p-4 shadow-[0_18px_45px_rgba(18,48,74,.08)]"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ backgroundColor: config.accent }}><Icon className="h-5 w-5 text-[#12304a]" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#78918d]">{isNews ? "Blog arşivi" : showAllTypes ? "Tüm içerik türleri" : "Admin kategorileri"}</p><p className="mt-1 max-w-xs text-sm font-semibold text-[#12304a]">{isNews ? "Güncel haber yazıları" : showAllTypes ? "Test, doküman, video ve daha fazlası" : "Yalnızca aktif kategoriler"}</p></div></div></div></div></div></section>
    <section className="container py-10 sm:py-14"><div className={isNews ? "" : "grid gap-8 lg:grid-cols-[.82fr_1.18fr]"}>{!isNews && <div><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#82918f]">Kategori ağacı</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Admin’in oluşturduğu kategoriler</h2><p className="mt-2 text-sm leading-6 text-[#6b7c79]">Bu sayfada kullanıcı filtresi yoktur. İçerikler yalnızca Admin panelinde oluşturulmuş aktif eğitim kategorileriyle gösterilir.</p></div>{overview.isLoading ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-10 text-center text-sm text-[#6b7c79]">Kategoriler hazırlanıyor…</div> : <CategoryTree nodes={nodes} contentByCategory={contentByCategory} onOutcomeOpen={id => setLocation(`/kazanim/${id}`)} />}</div>
      }
      <div className={isNews ? "mx-auto max-w-4xl" : ""}>{selectedClassNode && !isNews && subjectNodes.length > 0 && <section className="mb-9" aria-labelledby="class-subjects-heading"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#82918f]">{selectedClassNode.name} dersleri</p><h2 id="class-subjects-heading" className="mt-2 text-2xl font-semibold tracking-[-.04em]">Dersini seç, içerikleri keşfet</h2></div><span className="rounded-full bg-[#f0edff] px-3 py-1.5 text-xs font-bold text-[#5540e8]">{subjectNodes.length} ders</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{subjectNodes.map((subject, index) => { const isSelected = selectedSubjectNode?.id === subject.id; return <button type="button" key={subject.id} onClick={() => setLocation(buildContentTypeUrl(type, selectedClassNode.name, subject.id))} className={`group flex min-h-28 items-center gap-4 rounded-3xl border p-4 text-left shadow-[0_12px_28px_rgba(18,48,74,.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(18,48,74,.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8] ${isSelected ? "border-[#5540e8] bg-[#f5f2ff] ring-2 ring-[#ddd8ff]" : "border-[#dfe8e4] bg-white"}`}><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-bold ${isSelected ? "bg-[#5540e8] text-white" : "bg-[#edf4ff] text-[#2879c7]"}`}>{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate text-base font-semibold text-[#12304a]">{subject.name}</span><span className="mt-1 block text-xs font-semibold text-[#7b8f8c]">Ünite ve kazanımları görüntüle</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#8aa99e] transition group-hover:translate-x-1 group-hover:text-[#5540e8]" /></button>; })}</div></section>}<div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#82918f]">{isNews ? "Blog akışı" : type === "document" ? "Dijital kitaplık" : "İçerik listesi"}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">{showAllTypes ? "Yayınlanmış tüm içerikler" : `Yayınlanmış ${config.label.toLocaleLowerCase("tr-TR")}`}</h2></div><p className="text-sm text-[#6b7c79]">{filteredContent.length} içerik</p></div>{type === "document" && <div className="mb-6 rounded-3xl border border-[#e5ddc5] bg-[#fffaf0] p-4 shadow-[0_12px_30px_rgba(128,93,31,.06)]"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e7b354] text-[#5b3d0b]"><LibraryBig className="h-5 w-5" /></span><div className="min-w-0"><p className="text-sm font-bold text-[#6e4a0f]">Doküman kitaplığını keşfet</p><p className="text-xs text-[#927343]">Kapaklara göz atın veya başlık, özet ve kategori içinde arayın.</p></div></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="relative min-w-0 sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a58a58]" aria-hidden="true" /><input type="search" value={documentSearch} onChange={event => setDocumentSearch(event.target.value)} placeholder="Doküman ara…" aria-label="Doküman ara" className="h-10 w-full rounded-xl border border-[#e6d8b8] bg-white pl-9 pr-3 text-sm text-[#12304a] outline-none placeholder:text-[#aa9878] focus:border-[#d79b2b] focus:ring-2 focus:ring-[#d79b2b]/20" /></label><div className="flex rounded-xl border border-[#e6d8b8] bg-white p-1" aria-label="Doküman görünümü"><button type="button" aria-pressed={documentView === "shelf"} onClick={() => setDocumentView("shelf")} className={`grid h-8 min-w-9 place-items-center rounded-lg px-2 transition ${documentView === "shelf" ? "bg-[#6e4a0f] text-white" : "text-[#927343] hover:bg-[#fff4d9]"}`}><BookMarked className="h-4 w-4" /><span className="sr-only">Kitaplık görünümü</span></button><button type="button" aria-pressed={documentView === "grid"} onClick={() => setDocumentView("grid")} className={`grid h-8 min-w-9 place-items-center rounded-lg px-2 transition ${documentView === "grid" ? "bg-[#6e4a0f] text-white" : "text-[#927343] hover:bg-[#fff4d9]"}`}><LayoutGrid className="h-4 w-4" /><span className="sr-only">Izgara görünümü</span></button></div></div></div></div>}{overview.isLoading ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-10 text-center text-sm text-[#6b7c79]">İçerikler hazırlanıyor…</div> : visibleContent.length ? <div className={isNews ? "grid gap-6 sm:grid-cols-2" : type === "document" && documentView === "shelf" ? "grid gap-x-4 gap-y-8 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"}>{visibleContent.map(item => <article key={item.id} role="link" tabIndex={0} onClick={() => setLocation(`/icerik/${type}/${item.id}`)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setLocation(`/icerik/${type}/${item.id}`); } }} className={`group cursor-pointer overflow-hidden border border-[#dfe8e4] bg-white shadow-[0_14px_36px_rgba(18,48,74,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(18,48,74,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8] ${type === "document" && documentView === "shelf" ? "rounded-[1.35rem]" : "rounded-3xl"}`}>{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className={type === "document" && documentView === "shelf" ? "aspect-[3/4] w-full object-cover" : "h-36 w-full object-cover"} /> : <div className={type === "document" && documentView === "shelf" ? "aspect-[3/4] w-full" : "h-3"} style={{ backgroundColor: config.accent }} />}<div className={type === "document" && documentView === "shelf" ? "p-3 sm:p-4" : "p-5"}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#82918f]">{categoryNameById.get(item.categoryId ?? 0) ?? "Admin kategorisi"}</p><ArrowRight className="h-4 w-4 text-[#8aa99e]" /></div><h3 className="mt-2 text-lg font-semibold text-[#12304a]">{item.title}</h3>{item.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6b7c79]">{item.summary}</p>}</div></article>)}</div> : <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-[#7ba99b]" /><h3 className="mt-3 text-lg font-semibold">Henüz yayınlanmış içerik yok</h3><p className="mt-2 text-sm text-[#6b7c79]">Admin panelinden aktif kategoriye bağlı bir içerik yayınlandığında burada görünecek.</p></div>}{isNews && newsPagination.totalPages > 1 && <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Haber sayfaları">{Array.from({ length: newsPagination.totalPages }, (_, index) => index + 1).map(page => <button type="button" key={page} onClick={() => setLocation(`/icerik/news?page=${page}`)} aria-current={page === newsPagination.currentPage ? "page" : undefined} className={`grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-bold transition ${page === newsPagination.currentPage ? "bg-[#5540e8] text-white" : "border border-[#dfe8e4] bg-white text-[#526a69] hover:border-[#bdb3f4] hover:text-[#5540e8]"}`}>{page}</button>)}</nav>}</div>
    </div></section>
  </main>;
}
