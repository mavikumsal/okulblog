import { ArrowLeft, BookOpen, Check, CheckCircle2, Copy, Download, ExternalLink, FileText, Gamepad2, GraduationCap, Heart, Layers3, Newspaper, PlayCircle, Share2, Target } from "lucide-react";
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { categoryPathForNode, classGroupForName, contentTypes, type CategoryNode } from "./ContentHub";

const icons = { test: Target, document: FileText, video: PlayCircle, game: Gamepad2, simulation: Layers3, news: Newspaper } as const;
type ContentType = keyof typeof contentTypes;
type DetailItem = { id: number; title: string; summary?: string | null; body?: string | null; coverImageUrl?: string | null; categoryId?: number | null; contentType: string; status: string };

function isContentType(value: string | undefined): value is ContentType {
  return Boolean(value && value in contentTypes);
}

export function categoryBreadcrumb(categoryId: number | null | undefined, nodes: CategoryNode[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const path: CategoryNode[] = [];
  let current = categoryId ? byId.get(categoryId) : undefined;
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

function downloadContent(item: DetailItem) {
  const blob = new Blob([item.body || item.summary || item.title], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${item.title.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ -]/g, "-")}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function contentActionLabel(type: ContentType) {
  return type === "test" ? "Testi çöz" : type === "video" ? "Videoyu izle" : type === "document" ? "Dokümanı indir" : type === "game" ? "Oyunu başlat" : type === "simulation" ? "Simülasyonu aç" : "Haberi oku";
}

export function isProgressCompleted(progress: Array<{ contentType: string; contentId: number; status: string }> | undefined, contentType: string, contentId: number) {
  return Boolean(progress?.some(item => item.contentType === contentType && item.contentId === contentId && item.status === "completed"));
}

function shareTo(network: "facebook" | "whatsapp" | "x", title: string) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);
  const targets = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  };
  window.open(targets[network], "_blank", "noopener,noreferrer,width=650,height=560");
}

export default function ContentDetail() {
  const [, params] = useRoute("/icerik/:type/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const type = isContentType(params?.type) ? params.type : "test";
  const id = Number(params?.id);
  const overview = trpc.platform.overview.useQuery(undefined, { refetchOnWindowFocus: true, staleTime: 0 });
  const nodes = ((overview.data?.educationCategories ?? []) as CategoryNode[]).filter(node => node.isActive !== false);
  const item = (overview.data?.content ?? []).find(content => content.id === id && content.contentType === type && (content.status === "published" || content.status === "pending")) as DetailItem | undefined;
  const config = contentTypes[type];
  const Icon = icons[type];
  const breadcrumb = categoryBreadcrumb(item?.categoryId, nodes);
  const classNode = breadcrumb.find(node => node.level === "class");
  const classGroup = classGroupForName(classNode?.name);
  const DetailGroupIcon = classGroup.icon === "book" ? BookOpen : classGroup.icon === "layers" ? Layers3 : classGroup.icon === "graduation" ? GraduationCap : Target;
  const breadcrumbHref = (node: CategoryNode) => {
    const path = categoryPathForNode(node.id, nodes);
    const classAncestor = path.find(candidate => candidate.level === "class");
    const subjectAncestor = path.find(candidate => candidate.level === "subject");
    const query = new URLSearchParams();
    if (classAncestor) query.set("class", classAncestor.name);
    if (subjectAncestor) query.set("subject", String(subjectAncestor.id));
    const queryString = query.toString();
    return `/icerik/${type}${queryString ? `?${queryString}` : ""}`;
  };
  const favorites = trpc.member.favorites.useQuery(undefined, { enabled: Boolean(user) });
  const dashboard = trpc.member.dashboard.useQuery(undefined, { enabled: Boolean(user) });
  const toggleFavorite = trpc.member.toggleFavorite.useMutation({ onSuccess: () => favorites.refetch() });
  const updateProgress = trpc.member.progress.useMutation({ onSuccess: () => dashboard.refetch() });
  const [copied, setCopied] = useState(false);

  const isFavorited = Boolean(favorites.data?.some(favorite => favorite.contentType === type && favorite.contentId === id));
  const isCompleted = isProgressCompleted(dashboard.data?.progress, type, id);
  const handleProgress = () => {
    if (!user) { startLogin(); return; }
    updateProgress.mutate({ contentType: type, contentId: id, status: isCompleted ? "started" : "completed" });
  };
  const handleFavorite = () => {
    if (!user) { startLogin(); return; }
    toggleFavorite.mutate({ contentType: type, contentId: id });
  };
  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const actionLabel = contentActionLabel(type);
  const action = () => {
    if (type === "test") { setLocation(`/test/${id}`); return; }
    if (type === "document") { if (item) downloadContent(item); return; }
    document.getElementById("icerik-metni")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <main className="min-h-screen bg-[#f7f6f1] text-[#12304a]">
    <header className="border-b border-[#e5ece8] bg-white"><div className="container flex min-h-[68px] flex-wrap items-center justify-between gap-3 py-3"><button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2 text-left" aria-label="OkulBlog ana sayfa"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap className="h-5 w-5" /></span><span className="text-lg font-bold tracking-[-.06em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></span></button><button type="button" onClick={() => setLocation(`/icerik/${type}`)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#526a69] transition hover:bg-[#f0edff] hover:text-[#5540e8]"><ArrowLeft className="h-4 w-4" />{config.label}</button></div></header>
    <section className="container py-10 sm:py-16">
      {overview.isLoading ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-12 text-center text-sm text-[#6b7c79]">İçerik hazırlanıyor…</div> : !item ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-12 text-center"><h1 className="text-2xl font-semibold">İçerik bulunamadı</h1><p className="mt-2 text-sm text-[#6b7c79]">Bu içerik Admin tarafından kaldırılmış, pasif yapılmış veya henüz yayınlanmamış olabilir.</p><button type="button" onClick={() => setLocation(`/icerik/${type}`)} className="mt-6 rounded-full bg-[#5540e8] px-5 py-3 text-sm font-bold text-white">{config.label} sayfasına dön</button></div> : <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#dfe8e4] bg-white shadow-[0_20px_55px_rgba(18,48,74,.08)]"><div className="h-2" style={{ backgroundColor: config.accent }} />{item.coverImageUrl && <img src={item.coverImageUrl} alt="" className="max-h-[420px] w-full object-cover" />}<div className="p-6 sm:p-10"><nav aria-label="Kategori yolu" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6b7c79]"><button type="button" onClick={() => setLocation("/")} className="transition hover:text-[#5540e8]">Ana Sayfa</button><span aria-hidden="true">→</span><button type="button" onClick={() => setLocation(`/icerik/${type}`)} className="transition hover:text-[#5540e8]">{config.label}</button>{breadcrumb.map(node => <span key={node.id} className="flex items-center gap-2"><span aria-hidden="true">→</span><button type="button" onClick={() => setLocation(breadcrumbHref(node))} aria-current={node.id === breadcrumb.at(-1)?.id ? "page" : undefined} className={node.id === breadcrumb.at(-1)?.id ? "font-extrabold text-[#5540e8]" : "transition hover:text-[#5540e8]"}>{node.name}</button></span>)}</nav>{classNode && <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${classGroup.classes}`}><DetailGroupIcon className="h-4 w-4" aria-hidden="true" />{classGroup.label}</div>}<div className="mt-8 flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: config.accent }}><Icon className="h-6 w-6 text-[#12304a]" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#82918f]">{config.label}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[#12304a] sm:text-5xl">{item.title}</h1></div></div>{item.summary && <p className="mt-8 text-base leading-8 text-[#5e7470]">{item.summary}</p>}
        <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={action} className="inline-flex items-center gap-2 rounded-full bg-[#5540e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4432c9]">{type === "document" ? <Download className="h-4 w-4" /> : type === "test" ? <Target className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}{actionLabel}</button><button type="button" onClick={handleFavorite} disabled={toggleFavorite.isPending} aria-pressed={isFavorited} className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition ${isFavorited ? "border-[#f0b84d] bg-[#fff6df] text-[#9b6b14]" : "border-[#dbe7e2] bg-white text-[#526a69] hover:border-[#5540e8] hover:text-[#5540e8]"}`}><Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />{isFavorited ? "Favorilerde" : "Favoriye ekle"}</button><button type="button" onClick={handleProgress} disabled={updateProgress.isPending} aria-pressed={isCompleted} className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition ${isCompleted ? "border-[#76a892] bg-[#eaf6ef] text-[#3c765c]" : "border-[#dbe7e2] bg-white text-[#526a69] hover:border-[#76a892] hover:text-[#3c765c]"}`}><CheckCircle2 className="h-4 w-4" />{isCompleted ? "Tamamlandı" : "Öğrendim / Tamamladım"}</button></div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#edf1ed] pt-5"><span className="mr-1 text-xs font-bold text-[#82918f]">Paylaş:</span><button type="button" onClick={() => shareTo("facebook", item.title)} className="rounded-full border border-[#dbe7e2] px-3 py-2 text-xs font-bold text-[#526a69] hover:border-[#5540e8] hover:text-[#5540e8]">Facebook</button><button type="button" onClick={() => shareTo("whatsapp", item.title)} className="rounded-full border border-[#dbe7e2] px-3 py-2 text-xs font-bold text-[#526a69] hover:border-[#5540e8] hover:text-[#5540e8]">WhatsApp</button><button type="button" onClick={() => shareTo("x", item.title)} className="rounded-full border border-[#dbe7e2] px-3 py-2 text-xs font-bold text-[#526a69] hover:border-[#5540e8] hover:text-[#5540e8]">X</button><button type="button" onClick={copyLink} className="inline-flex items-center gap-1 rounded-full border border-[#dbe7e2] px-3 py-2 text-xs font-bold text-[#526a69] hover:border-[#5540e8] hover:text-[#5540e8]">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Kopyalandı" : "Bağlantıyı kopyala"}</button></div>
        <div id="icerik-metni" className="mt-8 rounded-2xl bg-[#f4f8f5] p-5 text-sm leading-7 text-[#526a69]">{item.body ? <p className="whitespace-pre-wrap">{item.body}</p> : "Bu içerik, OkulBlog Admin panelinde oluşturulan aktif kategori yapısına bağlı olarak yayınlanmaktadır."}</div>
      </div></article>}
    </section>
  </main>;
}
