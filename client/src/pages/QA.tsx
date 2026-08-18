import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import RichTextEditor from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock3, GraduationCap, ImagePlus, MessageCircle, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const navItems = [
  ["Ana Sayfa", "/"],
  ["Testler", "/panel/testler"],
  ["Dokümanlar", "/panel/dokumanlar"],
  ["Videolar", "/panel/videolar"],
  ["Oyunlar", "/panel/oyunlar"],
  ["Simülasyonlar", "/panel/simulasyonlar"],
  ["Haberler", "/panel/haberler"],
  ["Soru-Cevap", "/soru-cevap"],
] as const;

type CategoryNode = { id: number; name: string; level: string; parentId: number | null; sortOrder?: number | null };

function childrenOf(nodes: CategoryNode[], parentId: number | null, level?: string) {
  return nodes.filter(node => node.parentId === parentId && (!level || node.level === level));
}

function CategoryCascade({ nodes, values, onChange, prefix }: { nodes: CategoryNode[]; values: Record<string, string>; onChange: (level: string, value: string) => void; prefix: string }) {
  const levels = [
    ["ana-grup", "Ana grup", null],
    ["school-level", "Okul düzeyi", "ana-grup"],
    ["class", "Sınıf", "school-level"],
    ["subject", "Ders", "class"],
    ["unit", "Ünite", "subject"],
    ["outcome", "Kazanım", "unit"],
  ] as const;
  const roots = nodes.filter(node => node.level === "ana-grup" || node.parentId === null);
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{levels.map(([level, label, parentLevel]) => {
    const parentId = parentLevel ? Number(values[parentLevel] || 0) : null;
    const options = parentLevel ? (parentId ? childrenOf(nodes, parentId, level) : []) : roots;
    const visible = options.length > 0 || (!parentLevel && options.length > 0);
    if (!visible) return null;
    return <label key={`${prefix}-${level}`} className="grid gap-1.5 text-xs font-bold text-[#52666c]"><span>{label}</span><select aria-label={`${prefix} ${label}`} value={values[level] ?? ""} onChange={event => onChange(level, event.target.value)} className="h-11 rounded-xl border border-[#d8e6de] bg-white px-3 text-sm font-medium text-[#29465a] outline-none focus:border-[#5540e8] focus:ring-2 focus:ring-[#5540e8]/20"><option value="">{label} seçin</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
  })}</div>;
}

function QuestionCategoryTree({ nodes, selectedId, onSelect }: { nodes: CategoryNode[]; selectedId?: number; onSelect: (id: number) => void }) {
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set(nodes.filter(node => node.level === "ana-grup").map(node => node.id)));
  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, CategoryNode[]>();
    nodes.forEach(node => map.set(node.parentId, [...(map.get(node.parentId) ?? []), node]));
    map.forEach(children => children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id));
    return map;
  }, [nodes]);
  const renderBranch = (node: CategoryNode, depth = 0): React.ReactNode => {
    const children = childrenByParent.get(node.id) ?? [];
    const isOpen = openIds.has(node.id);
    const selected = selectedId === node.id;
    return <div key={node.id} className={depth ? "ml-3 border-l border-[#dbe7e2] pl-3" : ""}><div className={`flex items-center gap-1 rounded-xl px-2 py-1.5 transition ${selected ? "bg-[#f0edff] text-[#5540e8]" : "text-[#29465a] hover:bg-[#f6f8f4]"}`}><button type="button" onClick={() => children.length && setOpenIds(previous => { const next = new Set(previous); next.has(node.id) ? next.delete(node.id) : next.add(node.id); return next; })} aria-expanded={children.length ? isOpen : undefined} aria-label={`${node.name} kategorisini ${isOpen ? "kapat" : "aç"}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#6c8881]">{children.length ? (isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : <span className="h-1.5 w-1.5 rounded-full bg-[#b8ddd4]" />}</button><button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 truncate text-left text-xs font-semibold">{node.name}</button></div>{children.length > 0 && isOpen && <div className="space-y-0.5">{children.map(child => renderBranch(child, depth + 1))}</div>}</div>;
  };
  const roots = childrenByParent.get(null) ?? nodes.filter(node => node.level === "ana-grup");
  return <div className="rounded-2xl border border-[#d8e6de] bg-[#fbfdf9] p-3"><div className="mb-2 flex items-center gap-2"><BookOpen size={15} className="text-[#47736a]" /><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71838b]">Eğitim kategorileri</p></div><div className="max-h-72 space-y-1 overflow-y-auto">{roots.length ? roots.map(root => renderBranch(root)) : <p className="p-3 text-xs text-[#71838b]">Henüz aktif kategori yok.</p>}</div></div>;
}

export default function QA() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [answerFor, setAnswerFor] = useState<number | null>(null);
  const [answerBody, setAnswerBody] = useState("");
  const [answerImage, setAnswerImage] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactSent, setContactSent] = useState(false);
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [askSuccess, setAskSuccess] = useState(false);
  const [questionSort, setQuestionSort] = useState<"newest" | "answered" | "solved">("newest");
  const categories = trpc.platform.qa.categories.useQuery();
  const siteContact = trpc.platform.siteContact.useQuery();
  const nodes = categories.data?.education ?? [];
  const activeCategoryId = Number(categoryValues.outcome || categoryValues.unit || categoryValues.subject || categoryValues.class || categoryValues["school-level"] || categoryValues["ana-grup"] || 0) || undefined;
  const qa = trpc.platform.qa.list.useQuery({ search: search.trim() || undefined, categoryId: activeCategoryId });
  const upload = trpc.member.uploadQaImage.useMutation({ onError: error => toast.error(error.message) });
  const ask = trpc.member.askQuestion.useMutation({ onSuccess: () => { toast.success("Sorunuz moderasyon kuyruğuna alındı."); setTitle(""); setBody(""); setImageUrl(""); setIsAskOpen(false); setAskSuccess(true); qa.refetch(); }, onError: error => toast.error(error.message) });
  const answer = trpc.member.answerQuestion.useMutation({ onSuccess: () => { toast.success("Cevabınız moderasyon kuyruğuna alındı."); setAnswerFor(null); setAnswerBody(""); setAnswerImage(""); qa.refetch(); }, onError: error => toast.error(error.message) });
  const categoryIdForQuestion = activeCategoryId;
  const selectedCategoryLabel = useMemo(() => nodes.find(node => node.id === categoryIdForQuestion)?.name, [nodes, categoryIdForQuestion]);
  const selectedPathLabel = useMemo(() => ["ana-grup", "school-level", "class", "subject", "unit", "outcome"].map(level => nodes.find(node => node.id === Number(categoryValues[level]))?.name).filter(Boolean).join(" · "), [nodes, categoryValues]);
  const sortedQuestions = useMemo(() => {
    const questions = [...(qa.data?.questions ?? [])];
    const answerCount = (questionId: number) => (qa.data?.answers ?? []).filter(answer => answer.questionId === questionId).length;
    if (questionSort === "answered" || questionSort === "solved") return questions.filter(question => answerCount(question.id) > 0).sort((a, b) => answerCount(b.id) - answerCount(a.id));
    return questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [qa.data, questionSort]);
  const recentQuestions = useMemo(() => [...(qa.data?.questions ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [qa.data]);
  const recentAnsweredQuestions = useMemo(() => [...(qa.data?.questions ?? [])].filter(question => (qa.data?.answers ?? []).some(answer => answer.questionId === question.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [qa.data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restored: Record<string, string> = {};
    ["ana-grup", "school-level", "class", "subject", "unit", "outcome"].forEach(level => {
      const value = params.get(`${level}Id`);
      if (value) restored[level] = value;
    });
    if (Object.keys(restored).length) setCategoryValues(restored);
  }, []);

  const updateCategory = (level: string, value: string) => {
    const levelOrder = ["ana-grup", "school-level", "class", "subject", "unit", "outcome"];
    const next = { ...categoryValues };
    const index = levelOrder.indexOf(level);
    levelOrder.slice(index).forEach(item => { delete next[item]; });
    if (value) next[level] = value;
    setCategoryValues(next);
    const params = new URLSearchParams(window.location.search);
    ["ana-grup", "school-level", "class", "subject", "unit", "outcome"].forEach(item => params.delete(`${item}Id`));
    Object.entries(next).forEach(([item, selected]) => params.set(`${item}Id`, selected));
    const selectedId = Number(next.outcome || next.unit || next.subject || next.class || next["school-level"] || next["ana-grup"] || 0);
    if (selectedId) params.set("categoryId", String(selectedId)); else params.delete("categoryId");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setLocation(`${window.location.pathname}${query ? `?${query}` : ""}`);
  };
  const handleImage = (file: File, target: "question" | "answer") => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Görsel 5 MB'dan küçük olmalıdır."); return; }
    const reader = new FileReader();
    reader.onload = () => { const dataBase64 = String(reader.result).split(",")[1] ?? ""; upload.mutate({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", dataBase64 }, { onSuccess: result => target === "question" ? setImageUrl(result.url) : setAnswerImage(result.url) }); };
    reader.readAsDataURL(file);
  };
  const submitContact = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!contact.name.trim()) errors.name = "Adınızı yazın.";
    if (!contact.email.trim()) errors.email = "E-posta adresinizi yazın.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = "Geçerli bir e-posta girin.";
    if (!contact.message.trim()) errors.message = "Mesajınızı yazın.";
    setContactErrors(errors);
    if (Object.keys(errors).length) { setContactSent(false); return; }
    const recipient = siteContact.data?.contact_email;
    if (recipient) window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(`OkulBlog mesajı - ${contact.name.trim()}`)}&body=${encodeURIComponent(`${contact.message.trim()}\n\nGönderen: ${contact.name.trim()}\nE-posta: ${contact.email.trim()}`)}`;
    setContactSent(true); setContactErrors({}); setContact({ name: "", email: "", message: "" });
  };

  return <div className="min-h-screen bg-[#fbfaf4] text-[#18344f]">
    <header className="sticky top-0 z-50 border-b border-[#e6ebe5] bg-white/95 backdrop-blur-xl">
      <div className="container flex min-h-[76px] items-center justify-between gap-5 py-3"><button onClick={() => setLocation("/")} className="flex shrink-0 items-center gap-2.5 text-left" aria-label="OkulBlog ana sayfa"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5540e8] text-white shadow-[0_9px_20px_rgba(85,64,232,.22)]"><GraduationCap size={21} /></span><span className="text-[21px] font-bold tracking-[-.06em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></span></button><nav className="hidden min-w-0 flex-1 items-center justify-center gap-3 text-[11px] font-bold text-[#52666c] xl:flex">{navItems.map(([label, path]) => <button key={path} onClick={() => setLocation(path)} className={`relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95 ${path === "/soru-cevap" ? "bg-[#f0edff] text-[#5540e8] shadow-[0_6px_14px_rgba(85,64,232,.1)]" : ""}`}>{label}</button>)}</nav><Button onClick={() => isAuthenticated ? setLocation("/panel") : startLogin()} className="rounded-full bg-[#5540e8] font-bold text-white hover:bg-[#4632cf]">{isAuthenticated ? "Panelim" : "Giriş yap"}<ArrowRight size={15} /></Button></div>
    </header>
    <main className="container max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <section className="rounded-[28px] bg-[#18344f] p-7 text-white sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b8ddd4]">Topluluk alanı</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.04em]">{selectedPathLabel ? `${selectedPathLabel} soruları` : "Soru-Cevap"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d2dee0]">{selectedPathLabel ? `${selectedPathLabel} için soruları keşfet veya toplulukla paylaş.` : "Takıldığın yerde birlikte düşünelim. Dersini ve sınıfını seç, soruları keşfet veya toplulukla paylaş."}</p>{selectedPathLabel && <span className="mt-5 inline-flex rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-[#e7f4ef]">URL filtresi aktif · {selectedPathLabel}</span>}</section>
      <section className="mt-6 rounded-[24px] border border-[#e6e6de] bg-white p-5"><div className="grid gap-4"><div className="relative"><Search className="absolute left-3 top-3 text-[#78908c]" size={17} /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Sorularda ara..." className="h-11 rounded-xl pl-10" /></div><div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><QuestionCategoryTree nodes={nodes} selectedId={activeCategoryId} onSelect={id => { const node = nodes.find(item => item.id === id); if (node) updateCategory(node.level, String(id)); }} /><CategoryCascade nodes={nodes} values={categoryValues} onChange={updateCategory} prefix="Filtre" /></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#71838b]">{qa.data?.questions.length ?? 0} soru bulundu{selectedCategoryLabel ? ` · ${selectedCategoryLabel}` : ""}</p><Button variant="outline" onClick={() => { setSearch(""); setCategoryValues({}); window.history.replaceState(null, "", window.location.pathname); setLocation("/soru-cevap"); }} disabled={!search && !activeCategoryId} className="rounded-xl"><X size={15} /> Temizle</Button></div></div></section>
      {!isAuthenticated ? <section className="mt-6 rounded-[24px] border border-[#e6e6de] bg-white p-7 text-center"><MessageCircle className="mx-auto text-[#47736a]" size={30} /><h2 className="mt-3 text-xl font-bold text-[#29465a]">Soru sormak için giriş yapın</h2><Button onClick={() => startLogin()} className="mt-5 rounded-xl bg-[#18344f]">Üye girişi yap</Button></section> : <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#e6e6de] bg-white p-6"><div><h2 className="text-xl font-bold text-[#29465a]">Topluluğa sorunu yönelt</h2><p className="mt-1 text-sm text-[#71838b]">Seçtiğin kategoriye bağlı bir soru oluştur ve istersen görsel ekle.</p></div><Button onClick={() => setIsAskOpen(true)} className="rounded-xl bg-[#5540e8] font-bold text-white shadow-[0_10px_22px_rgba(85,64,232,.18)] transition hover:-translate-y-0.5 hover:bg-[#4632cf]"><MessageCircle size={16} /> Soru Sor</Button></section>}
      {isAskOpen && isAuthenticated && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#10243b]/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setIsAskOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="ask-question-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(16,36,59,.28)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#47736a]">Yeni topluluk sorusu</p><h2 id="ask-question-title" className="mt-2 text-2xl font-bold text-[#29465a]">Soru Sor</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Soru önce moderasyona gönderilir. Göndermeden önce ders veya sınıf filtresini seçtiğinden emin ol.</p></div><button type="button" onClick={() => setIsAskOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2f4ef] text-[#52666c] transition hover:bg-[#e6ebe5]" aria-label="Soru penceresini kapat"><X size={18} /></button></div><div className="mt-6 space-y-4"><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Soru başlığı" aria-label="Soru başlığı" className="h-11 rounded-xl" /><RichTextEditor value={body} onChange={setBody} label="Soru metni" ariaLabel="Soru metni" testId="qa-question-editor" /><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d8e6de] px-3 py-2 text-sm font-semibold text-[#47736a] transition hover:border-[#5540e8] hover:bg-[#f7f5ff]"><ImagePlus size={16} /> Görsel ekle<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) handleImage(file, "question"); }} /></label>{imageUrl && <div className="relative w-fit"><img src={imageUrl} alt="Soru görseli önizlemesi" className="h-28 w-28 rounded-xl object-cover ring-2 ring-[#b8ddd4]" /><button type="button" onClick={() => setImageUrl("")} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#18344f] text-white" aria-label="Görseli kaldır"><X size={14} /></button></div>}<p className="text-xs text-[#71838b]">PNG, JPG veya WebP görsel ekleyebilirsin. Maksimum dosya boyutu: <strong className="text-[#29465a]">5 MB</strong>.</p><Button disabled={title.trim().length < 3 || body.replace(/<[^>]+>/g, " ").trim().length < 3 || !categoryIdForQuestion || ask.isPending} onClick={() => ask.mutate({ title, body, imageUrl: imageUrl || undefined, categoryId: categoryIdForQuestion! })} className="rounded-xl bg-[#18344f] font-bold"><Send size={16} /> {ask.isPending ? "Gönderiliyor..." : "Soruyu gönder"}</Button></div></section></div>}
      {askSuccess && <div className="fixed inset-0 z-[90] grid place-items-center bg-[#10243b]/35 p-4 backdrop-blur-sm" role="presentation"><section role="status" aria-live="polite" className="qa-success-pop w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-[0_24px_80px_rgba(16,36,59,.25)]"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e5f5ec] text-[#247052]"><CheckCircle2 size={36} strokeWidth={2.5} /></span><h2 className="mt-5 text-2xl font-bold text-[#29465a]">Sorunuz gönderildi</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Sorunuz moderasyon sonrası yayınlanacak. İlginiz için teşekkürler.</p><Button onClick={() => setAskSuccess(false)} className="mt-6 rounded-xl bg-[#5540e8] font-bold text-white hover:bg-[#4632cf]">Tamam</Button></section></div>}
      <section className="mt-8 space-y-4"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold text-[#29465a]">Yayınlanan sorular</h2><p className="mt-1 text-xs text-[#71838b]">{sortedQuestions.length} soru gösteriliyor</p></div><label className="grid gap-1.5 text-xs font-bold text-[#52666c]">Sıralama<select aria-label="Soru sıralama" value={questionSort} onChange={event => setQuestionSort(event.target.value as typeof questionSort)} className="h-10 min-w-48 rounded-xl border border-[#d8e6de] bg-white px-3 text-sm font-semibold text-[#29465a] outline-none transition focus:border-[#5540e8] focus:ring-2 focus:ring-[#5540e8]/20"><option value="newest">En Yeni</option><option value="answered">En Çok Cevaplanan</option><option value="solved">Çözüldü</option></select></label></div>{qa.isLoading ? <div className="rounded-2xl bg-white p-6">Sorular yükleniyor...</div> : !sortedQuestions.length ? <div className="rounded-2xl bg-white p-6 text-sm text-[#71838b]">{questionSort === "solved" ? "Henüz cevaplanmış/çözülmüş soru bulunamadı." : "Aramanızla eşleşen soru bulunamadı."}</div> : sortedQuestions.map(question => <article id={`qa-question-${question.id}`} key={question.id} className="rounded-2xl border border-[#e6e6de] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-lg font-bold text-[#29465a]">{question.title}</h3>{(qa.data?.answers ?? []).some(item => item.questionId === question.id) && <span className="rounded-full bg-[#e5f5ec] px-2.5 py-1 text-[11px] font-bold text-[#247052]">Çözüldü</span>}</div><div className="prose prose-sm mt-3 max-w-none text-[#587079]" dangerouslySetInnerHTML={{ __html: question.body }} />{question.imageUrl && <img src={question.imageUrl} alt="" className="mt-4 max-h-64 rounded-xl object-contain" />}<div className="mt-5 space-y-3">{(qa.data?.answers ?? []).filter(item => item.questionId === question.id).map(item => <div key={item.id} className="rounded-xl bg-[#f5f7f2] p-4"><div className="prose prose-sm max-w-none text-[#587079]" dangerouslySetInnerHTML={{ __html: item.body }} /></div>)}</div>{isAuthenticated && <div className="mt-5">{answerFor === question.id ? <div className="space-y-3"><RichTextEditor value={answerBody} onChange={setAnswerBody} label="Cevabınız" ariaLabel="Cevap metni" testId={`qa-answer-editor-${question.id}`} /><Button onClick={() => answer.mutate({ questionId: question.id, body: answerBody, imageUrl: answerImage || undefined })} disabled={answerBody.replace(/<[^>]+>/g, "").trim().length < 3 || answer.isPending} className="rounded-lg bg-[#47736a]">Cevabı gönder</Button></div> : <Button variant="outline" onClick={() => setAnswerFor(question.id)} className="rounded-lg">Cevap yaz</Button>}</div>}</article>)}</section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center gap-2"><Clock3 size={18} className="text-[#5540e8]" /><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#71838b]">Güncel akış</p><h2 className="mt-1 text-xl font-bold text-[#29465a]">Son sorulan sorular</h2></div></div><div className="mt-4 space-y-3">{recentQuestions.length ? recentQuestions.map(question => <button type="button" key={question.id} onClick={() => document.getElementById(`qa-question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="block w-full rounded-xl bg-[#f7faf6] p-3 text-left transition hover:bg-[#f0edff]"><p className="line-clamp-2 text-sm font-semibold text-[#29465a]">{question.title}</p><p className="mt-1 text-[11px] text-[#71838b]">{new Date(question.createdAt).toLocaleDateString("tr-TR")}</p></button>) : <p className="text-sm text-[#71838b]">Henüz yayınlanmış soru yok.</p>}</div></div><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center gap-2"><MessageCircle size={18} className="text-[#47736a]" /><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#71838b]">Topluluk yanıtları</p><h2 className="mt-1 text-xl font-bold text-[#29465a]">Son cevaplanan sorular</h2></div></div><div className="mt-4 space-y-3">{recentAnsweredQuestions.length ? recentAnsweredQuestions.map(question => <button type="button" key={question.id} onClick={() => document.getElementById(`qa-question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="block w-full rounded-xl bg-[#f7faf6] p-3 text-left transition hover:bg-[#eef8f3]"><p className="line-clamp-2 text-sm font-semibold text-[#29465a]">{question.title}</p><p className="mt-1 text-[11px] text-[#247052]">Cevaplandı · {((qa.data?.answers ?? []).filter(answer => answer.questionId === question.id)).length} cevap</p></button>) : <p className="text-sm text-[#71838b]">Henüz cevaplanmış soru yok.</p>}</div></div></section>
      <section id="iletisim" className="mt-8 rounded-[24px] border border-[#e6e6de] bg-white p-6 sm:p-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#47736a]">İletişim</p><h2 className="mt-3 text-3xl font-bold tracking-[-.04em] text-[#29465a]">OkulBlog ekibi burada.</h2><p className="mt-3 text-sm leading-6 text-[#71838b]">Öneri, iş birliği ve destek talepleriniz için bize ulaşın.</p></div><form onSubmit={submitContact} className="grid gap-4" noValidate><label className="grid gap-1.5 text-xs font-bold text-[#52666c]">Adınız<input aria-label="Adınız" value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} className="h-11 rounded-xl border border-[#d8e6de] px-3 text-sm font-normal outline-none focus:border-[#5540e8]" />{contactErrors.name && <span className="text-[11px] text-[#b45545]">{contactErrors.name}</span>}</label><label className="grid gap-1.5 text-xs font-bold text-[#52666c]">E-posta<input aria-label="E-posta" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} className="h-11 rounded-xl border border-[#d8e6de] px-3 text-sm font-normal outline-none focus:border-[#5540e8]" />{contactErrors.email && <span className="text-[11px] text-[#b45545]">{contactErrors.email}</span>}</label><label className="grid gap-1.5 text-xs font-bold text-[#52666c]">Mesajınız<textarea aria-label="Mesajınız" rows={4} value={contact.message} onChange={event => setContact({ ...contact, message: event.target.value })} className="rounded-xl border border-[#d8e6de] px-3 py-2 text-sm font-normal outline-none focus:border-[#5540e8]" />{contactErrors.message && <span className="text-[11px] text-[#b45545]">{contactErrors.message}</span>}</label>{contactSent && <p role="status" className="rounded-xl bg-[#e5f5ec] px-4 py-3 text-sm font-semibold text-[#247052]">Mesajınız hazırlandı. E-posta uygulamanız açılmadıysa lütfen site yöneticisiyle iletişime geçin.</p>}<Button type="submit" className="w-fit rounded-xl bg-[#5540e8] font-bold hover:bg-[#4632cf]"><Send size={15} /> Mesaj gönder</Button></form></div></section>
    </main>
  </div>;
}
