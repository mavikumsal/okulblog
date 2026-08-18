import { ArrowLeft, FileText, Gamepad2, GraduationCap, Layers3, Newspaper, PlayCircle, Target } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { contentTypes, type CategoryNode } from "./ContentHub";

const icons = { test: Target, document: FileText, video: PlayCircle, game: Gamepad2, simulation: Layers3, news: Newspaper } as const;
type ContentType = keyof typeof contentTypes;

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

export default function ContentDetail() {
  const [, params] = useRoute("/icerik/:type/:id");
  const [, setLocation] = useLocation();
  const type = isContentType(params?.type) ? params.type : "test";
  const id = Number(params?.id);
  const overview = trpc.platform.overview.useQuery(undefined, { refetchOnWindowFocus: true, staleTime: 0 });
  const nodes = ((overview.data?.educationCategories ?? []) as CategoryNode[]).filter(node => node.isActive !== false);
  const item = (overview.data?.content ?? []).find(content => content.id === id && content.contentType === type && (content.status === "published" || content.status === "pending"));
  const config = contentTypes[type];
  const Icon = icons[type];
  const breadcrumb = categoryBreadcrumb(item?.categoryId, nodes);

  return <main className="min-h-screen bg-[#f7f6f1] text-[#12304a]">
    <header className="border-b border-[#e5ece8] bg-white"><div className="container flex min-h-[68px] flex-wrap items-center justify-between gap-3 py-3"><button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2 text-left" aria-label="OkulBlog ana sayfa"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap className="h-5 w-5" /></span><span className="text-lg font-bold tracking-[-.06em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></span></button><button type="button" onClick={() => setLocation(`/icerik/${type}`)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#526a69] transition hover:bg-[#f0edff] hover:text-[#5540e8]"><ArrowLeft className="h-4 w-4" />{config.label}</button></div></header>
    <section className="container py-10 sm:py-16">
      {overview.isLoading ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-12 text-center text-sm text-[#6b7c79]">İçerik hazırlanıyor…</div> : !item ? <div className="rounded-3xl border border-dashed border-[#cbd9d5] bg-white p-12 text-center"><h1 className="text-2xl font-semibold">İçerik bulunamadı</h1><p className="mt-2 text-sm text-[#6b7c79]">Bu içerik Admin tarafından kaldırılmış, pasif yapılmış veya henüz yayınlanmamış olabilir.</p><button type="button" onClick={() => setLocation(`/icerik/${type}`)} className="mt-6 rounded-full bg-[#5540e8] px-5 py-3 text-sm font-bold text-white">{config.label} sayfasına dön</button></div> : <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#dfe8e4] bg-white shadow-[0_20px_55px_rgba(18,48,74,.08)]"><div className="h-2" style={{ backgroundColor: config.accent }} />{item.coverImageUrl && <img src={item.coverImageUrl} alt="" className="max-h-[420px] w-full object-cover" />}<div className="p-6 sm:p-10"><nav aria-label="Kategori yolu" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6b7c79]"><button type="button" onClick={() => setLocation(`/icerik/${type}`)} className="transition hover:text-[#5540e8]">{config.label}</button>{breadcrumb.map(node => <span key={node.id} className="flex items-center gap-2"><span aria-hidden="true">→</span><span>{node.name}</span></span>)}</nav><div className="mt-8 flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: config.accent }}><Icon className="h-6 w-6 text-[#12304a]" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#82918f]">{config.label}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[#12304a] sm:text-5xl">{item.title}</h1></div></div>{item.summary && <p className="mt-8 text-base leading-8 text-[#5e7470]">{item.summary}</p>}<div className="mt-10 rounded-2xl bg-[#f4f8f5] p-5 text-sm leading-7 text-[#526a69]">Bu içerik, OkulBlog Admin panelinde oluşturulan aktif kategori yapısına bağlı olarak yayınlanmaktadır.</div></div></article>}
    </section>
  </main>;
}
