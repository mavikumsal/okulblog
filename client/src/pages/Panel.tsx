import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  FileText,
  FolderPlus,
  FolderTree,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const roleName: Record<string, string> = { admin: "Admin", teacher: "Öğretmen", moderator: "Moderatör", member: "Üye", user: "Üye" };
const managedSections = ["Kategoriler", "Kurum Kategorisi", "Soru Havuzu", "Testler", "Dokümanlar", "Videolar", "Simülasyonlar", "Oyunlar", "Haberler"] as const;
const hierarchy = ["Ana Grup", "İlkokul/Ortaokul", "Sınıf", "Ders", "Ünite", "Kazanım"];

function PanelContent() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const requestedSection = location.split("/")[2] ?? "genel";
  const section = requestedSection === "ayarlar" && !isAdmin ? "restricted-settings" : requestedSection;
  const panelSections = trpc.panel.accessibleSections.useQuery(undefined, { enabled: Boolean(user) });
  const overview = trpc.platform.overview.useQuery();
  const [permissionRole, setPermissionRole] = useState<"teacher" | "moderator">("teacher");
  const permissions = trpc.permissions.forRole.useQuery({ role: permissionRole }, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const updatePermission = trpc.permissions.update.useMutation({
    onSuccess: () => {
      utils.permissions.forRole.invalidate({ role: permissionRole });
      toast.success("Bölüm erişimi güncellendi.");
    },
    onError: () => toast.error("Erişim ayarı güncellenemedi."),
  });
  const [categoryName, setCategoryName] = useState("");
  const [categoryMode, setCategoryMode] = useState<"education" | "institution">("education");
  const [categoryParentId, setCategoryParentId] = useState("root");
  const categoryNodes = trpc.categories.list.useQuery({}, { enabled: Boolean(user) });
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      setCategoryName("");
      utils.categories.list.invalidate();
      utils.platform.overview.invalidate();
      toast.success("Kategori oluşturuldu.");
    },
    onError: () => toast.error("Kategori oluşturulamadı."),
  });
  const updateInstitutionStatus = trpc.categories.setInstitutionStatus.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); utils.platform.overview.invalidate(); toast.success("Kurum kategori durumu güncellendi."); },
    onError: () => toast.error("Kurum kategori durumu güncellenemedi."),
  });
  const availableParents = (categoryNodes.data ?? []).filter(item => item.categoryType === categoryMode);
  const selectedParent = availableParents.find(item => String(item.id) === categoryParentId);
  const educationNextLevel: Record<string, "school-level" | "class" | "subject" | "unit" | "outcome"> = { "ana-grup": "school-level", "school-level": "class", class: "subject", subject: "unit", unit: "outcome" };
  const categoryLevel = categoryMode === "education" ? (selectedParent ? educationNextLevel[selectedParent.level] : "ana-grup") : (selectedParent ? "institution-child" : "institution-root");
  const categoryLevelLabel = categoryMode === "institution" ? (selectedParent ? "Alt Kurum Kategorisi" : "Kurum Kategorisi") : ({ "ana-grup": "Ana Grup", "school-level": "İlkokul/Ortaokul", class: "Sınıf", subject: "Ders", unit: "Ünite", outcome: "Kazanım" }[categoryLevel as "ana-grup" | "school-level" | "class" | "subject" | "unit" | "outcome"] ?? "Kazanım");
  const roleSections = panelSections.data ?? [];
  const isAllowed = (name: string) => isAdmin || (roleSections as string[]).includes(name);
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionType, setQuestionType] = useState<"multiple-choice" | "true-false" | "open-ended">("multiple-choice");
  const [questionDifficulty, setQuestionDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCategoryId, setQuestionCategoryId] = useState("");
  const questions = trpc.questions.list.useQuery(undefined, { enabled: Boolean(user) && isAllowed("Soru Havuzu") });
  const createQuestion = trpc.questions.create.useMutation({
    onSuccess: () => { setQuestionPrompt(""); utils.questions.list.invalidate(); toast.success("Soru taslak olarak soru havuzuna eklendi."); },
    onError: () => toast.error("Soru kaydedilemedi."),
  });
  const [aiTopic, setAiTopic] = useState("");
  const aiQuestion = trpc.ai.generateQuestion.useMutation({
    onSuccess: draft => { setAiTopic(""); utils.questions.list.invalidate(); toast.success("Yapay zekâ soru taslağını soru havuzuna ekledi."); },
    onError: () => toast.error("Yapay zekâ ile soru üretilemedi. Lütfen daha sonra tekrar deneyin."),
  });
  const [contentTitle, setContentTitle] = useState("");
  const [contentSummary, setContentSummary] = useState("");
  const [contentType, setContentType] = useState<"test" | "document" | "simulation" | "video" | "game" | "news">("document");
  const [contentCategoryId, setContentCategoryId] = useState("");
  const createContent = trpc.contents.create.useMutation({
    onSuccess: () => { setContentTitle(""); setContentSummary(""); utils.platform.overview.invalidate(); toast.success("İçerik taslak olarak kaydedildi."); },
    onError: () => toast.error("İçerik kaydedilemedi."),
  });
  const activePermissions = useMemo(() => new Map((permissions.data ?? []).map(item => [item.section, item.isEnabled])), [permissions.data]);
  const adminUsers = trpc.admin.users.useQuery(undefined, { enabled: isAdmin });
  const securityEvents = trpc.security.list.useQuery(undefined, { enabled: isAdmin });
  const adminSettings = trpc.admin.settings.useQuery(undefined, { enabled: isAdmin });
  const [settingValue, setSettingValue] = useState("");
  const [adSensePublisherId, setAdSensePublisherId] = useState("");
  const [customAdSnippet, setCustomAdSnippet] = useState("");
  const saveSetting = trpc.admin.saveSetting.useMutation({
    onSuccess: () => { setSettingValue(""); utils.admin.settings.invalidate(); toast.success("Site ayarı kaydedildi."); },
    onError: () => toast.error("Site ayarı kaydedilemedi."),
  });
  const [newsCategoryName, setNewsCategoryName] = useState("");
  const newsCategories = trpc.admin.newsCategories.useQuery(undefined, { enabled: isAdmin });
  const createNewsCategory = trpc.admin.createNewsCategory.useMutation({
    onSuccess: () => { setNewsCategoryName(""); utils.admin.newsCategories.invalidate(); toast.success("Haber kategorisi eklendi."); },
    onError: () => toast.error("Haber kategorisi eklenemedi."),
  });

  const titleMap: Record<string, { eyebrow: string; title: string; text: string }> = {
    genel: { eyebrow: "Kontrol merkezi", title: "Öğrenme ekosisteminize hoş geldiniz.", text: "Bu alan, rolünüz için açık olan modüllere hızlı erişim sağlar." },
    kategoriler: { eyebrow: "Eğitim kategorisi", title: "İçerikleri doğru öğrenme bağlamına yerleştirin.", text: "Ana Grup → İlkokul/Ortaokul → Sınıf → Ders → Ünite → Kazanım sırası sabittir." },
    "soru-havuzu": { eyebrow: "Ölçme alanı", title: "Soru havuzunuzu güvenle büyütün.", text: "Çoktan seçmeli, doğru-yanlış ve açık uçlu sorular için merkezi çalışma alanı." },
    icerikler: { eyebrow: "İçerik stüdyosu", title: "Tüm içerik türleri aynı düzende.", text: "Testler, Dokümanlar, Simülasyonlar, Videolar, Oyunlar ve Haberler kategoriyle ilişkilendirilir." },
    ai: { eyebrow: "Yapay zekâ üretimi", title: "Kazanımdan ölçme deneyimine.", text: "Konu veya kazanım seçerek yapılandırılmış soru ve test taslakları oluşturun." },
  };
  const page = titleMap[section] ?? { eyebrow: "OkulBlog paneli", title: "Bu alan yapılandırılıyor.", text: "Rolünüze uygun modül ve izin ayarları burada görünür." };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-col gap-5 rounded-[26px] border border-[#e4e5db] bg-[#fbfaf4] p-6 shadow-[0_12px_35px_rgba(37,61,77,.05)] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><p className="text-[11px] font-bold tracking-[.18em] text-[#668278] uppercase">{page.eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-[#18344f] sm:text-4xl">{page.title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#657b87]">{page.text}</p></div>
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d9eee7] text-[#266b5d]"><GraduationCap size={22} /></div><div><p className="text-sm font-bold text-[#244359]">OkulBlog hesabı</p><Badge className="mt-1 border-0 bg-[#eef4f0] text-[#548073] hover:bg-[#eef4f0]">{roleName[user?.role ?? "member"]}</Badge></div></div>
      </div>

      {section === "restricted-settings" && <RestrictedNotice />}

      {section === "genel" && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Eğitim Kategorileri" value={String(overview.data?.educationCategories.length ?? 0)} icon={FolderTree} tone="bg-[#e0f2ea] text-[#276e61]" />
          <StatCard label="Kurum Kategorileri" value={String(overview.data?.institutionCategories.length ?? 0)} icon={Layers3} tone="bg-[#f8edcf] text-[#9c7427]" />
          <StatCard label="Yayınlanan İçerik" value={String(overview.data?.content.length ?? 0)} icon={FileText} tone="bg-[#e7e5f8] text-[#62538d]" />
          <StatCard label="Açık Modüller" value={String(isAdmin ? managedSections.length : roleSections.length)} icon={CheckCircle2} tone="bg-[#e0eaf5] text-[#386886]" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-[#23435a]">Rolünüze açık modüller</p><p className="mt-1 text-xs leading-5 text-[#74878f]">Admin tarafından görünürlüğü belirlenen çalışma alanları.</p></div><LockKeyhole size={18} className="text-[#729487]" /></div><div className="mt-6 grid gap-2 sm:grid-cols-2">{(isAdmin ? managedSections : roleSections).length ? (isAdmin ? managedSections : roleSections).map(name => <button key={name} onClick={() => setLocation(`/panel/${name.toLocaleLowerCase("tr-TR").replaceAll(" ", "-").replace("ı", "i").replace("ş", "s")}`)} className="flex items-center justify-between rounded-xl border border-[#edf0eb] px-4 py-3 text-left text-sm font-semibold text-[#39566a] transition hover:border-[#c8ddd5] hover:bg-[#f7fbf8]"><span>{name}</span><ChevronRight size={16} className="text-[#91aaa3]" /></button>) : <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087] sm:col-span-2">Bu rol için henüz açık bir modül yok. Admin panelinden ilgili erişim ayarı açılabilir.</div>}</div></section>
          <section className="rounded-[24px] bg-[#18344f] p-6 text-white"><div className="flex items-center justify-between"><p className="text-sm font-bold">Kategori mimarisi</p><CircleDotDashed size={18} className="text-[#f3d07b]" /></div><p className="mt-3 text-sm leading-6 text-[#c8d4d6]">Eğitim içerikleri sabit sıradaki altı adım üzerinden ilişkilendirilir.</p><div className="mt-6 flex flex-wrap items-center gap-2">{hierarchy.map((name, index) => <div className="flex items-center gap-2" key={name}><span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#edf4f2]">{name}</span>{index < hierarchy.length - 1 && <ChevronRight size={14} className="text-[#80afa5]" />}</div>)}</div><Button onClick={() => setLocation("/panel/kategoriler")} className="mt-8 bg-[#f3d07b] text-[#203b51] hover:bg-[#f7dfa0]">Kategori yönetimine git <ArrowLeft className="rotate-180" size={16} /></Button></section>
        </div>
      </>}

      {section === "kategoriler" && <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0f2ea] text-[#286d60]"><FolderPlus size={20} /></span><div><h2 className="font-bold text-[#29465a]">Kategori ekle</h2><p className="text-xs text-[#71838b]">Üst kategori seçerek iç içe yapı kurun.</p></div></div>{isAdmin ? <div className="mt-6 space-y-4"><div className="grid grid-cols-2 rounded-xl bg-[#f2f5ef] p-1"><button onClick={() => { setCategoryMode("education"); setCategoryParentId("root"); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${categoryMode === "education" ? "bg-white text-[#23435a] shadow-sm" : "text-[#74848a]"}`}>Eğitim</button><button onClick={() => { setCategoryMode("institution"); setCategoryParentId("root"); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${categoryMode === "institution" ? "bg-white text-[#23435a] shadow-sm" : "text-[#74848a]"}`}>Kurum</button></div><div className="space-y-2"><Label>Üst kategori</Label><select value={categoryParentId} onChange={event => setCategoryParentId(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="root">{categoryMode === "education" ? "Yeni Ana Grup" : "Yeni Kurum Kategorisi"}</option>{availableParents.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="text-[11px] text-[#839096]">Oluşacak düzey: {categoryLevelLabel}</p></div><div className="space-y-2"><Label htmlFor="categoryName">Kategori adı</Label><Input id="categoryName" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder={categoryMode === "education" ? "Örn. İlkokul" : "Örn. KPSS"} className="h-11 rounded-xl" /></div><Button disabled={!categoryName.trim() || createCategory.isPending || (categoryMode === "education" && Boolean(selectedParent && selectedParent.level === "outcome"))} onClick={() => createCategory.mutate({ name: categoryName, categoryType: categoryMode, level: categoryLevel, parentId: categoryParentId === "root" ? undefined : Number(categoryParentId) })} className="w-full rounded-xl bg-[#18344f]">{createCategory.isPending ? "Kaydediliyor..." : "Kategori oluştur"}<Plus size={16} /></Button></div> : <RestrictedNotice />}</div><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><p className="text-sm font-bold text-[#29465a]">Kategori mimarisi</p><p className="mt-1 text-xs leading-5 text-[#71838b]">Eğitim için sıra sabittir; Kurum Kategorisi bağımsız bir ağaçtır.</p><div className="mt-6 space-y-2">{hierarchy.map((name, index) => <div key={name} className="flex items-center gap-4 rounded-xl border border-[#edf0eb] px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#eef5f0] text-xs font-bold text-[#528374]">{index + 1}</span><span className="text-sm font-semibold text-[#365368]">{name}</span></div>)}</div><div className="mt-6 border-t border-[#edf0eb] pt-5"><p className="text-xs font-bold tracking-[.14em] text-[#70877e] uppercase">Kayıtlı kategoriler</p><div className="mt-3 space-y-2">{categoryNodes.isLoading ? <p className="text-sm text-[#7d8c91]">Yükleniyor...</p> : (categoryNodes.data ?? []).length ? categoryNodes.data?.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f4] px-3 py-2.5"><span className="text-sm font-semibold text-[#456073]">{item.name}</span>{item.categoryType === "institution" ? <div className="flex items-center gap-2"><span className={`text-[10px] font-bold ${item.isActive ? "text-[#4f876e]" : "text-[#9a746b]"}`}>{item.isActive ? "Aktif" : "Pasif"}</span>{isAdmin && <Switch checked={item.isActive} disabled={updateInstitutionStatus.isPending} onCheckedChange={isActive => updateInstitutionStatus.mutate({ id: item.id, isActive })} />}</div> : <Badge variant="outline" className="text-[10px]">Eğitim</Badge>}</div>) : <p className="text-sm leading-6 text-[#7d8c91]">Henüz kategori bulunmuyor. İlk yapıyı soldaki formdan ekleyin.</p>}</div></div></div></section>}

      {section === "soru-havuzu" && <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0f2ea] text-[#286d60]"><Target size={20} /></span><div><h2 className="font-bold text-[#29465a]">Yeni soru</h2><p className="text-xs text-[#71838b]">Önce taslak olarak kaydedilir.</p></div></div>{isAllowed("Soru Havuzu") ? <div className="mt-6 space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Soru türü</Label><select value={questionType} onChange={event => setQuestionType(event.target.value as typeof questionType)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="multiple-choice">Çoktan seçmeli</option><option value="true-false">Doğru - yanlış</option><option value="open-ended">Açık uçlu</option></select></div><div className="space-y-2"><Label>Zorluk</Label><select value={questionDifficulty} onChange={event => setQuestionDifficulty(event.target.value as typeof questionDifficulty)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="easy">Kolay</option><option value="medium">Orta</option><option value="hard">Zor</option></select></div></div><div className="space-y-2"><Label>Kategori</Label><select value={questionCategoryId} onChange={event => setQuestionCategoryId(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Kategori seçin (isteğe bağlı)</option>{(categoryNodes.data ?? []).filter(item => item.categoryType === "institution" ? item.isActive : true).map(item => <option key={item.id} value={item.id}>{item.categoryType === "education" ? "Eğitim" : "Kurum"} · {item.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="questionPrompt">Soru metni</Label><Textarea id="questionPrompt" value={questionPrompt} onChange={event => setQuestionPrompt(event.target.value)} placeholder="Örn. Metindeki ana fikri belirleyiniz." className="min-h-30 rounded-xl" /></div><Button disabled={questionPrompt.trim().length < 12 || createQuestion.isPending} onClick={() => createQuestion.mutate({ questionType, prompt: questionPrompt, difficulty: questionDifficulty, categoryId: questionCategoryId ? Number(questionCategoryId) : undefined })} className="w-full rounded-xl bg-[#18344f]">{createQuestion.isPending ? "Kaydediliyor..." : "Taslak soru ekle"}<Plus size={16} /></Button></div> : <RestrictedNotice />}</div><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[#29465a]">Soru havuzu</h2><p className="mt-1 text-xs text-[#71838b]">Son eklenen taslaklar</p></div><Badge className="border-0 bg-[#edf4ef] text-[#548073] hover:bg-[#edf4ef]">{questions.data?.length ?? 0} soru</Badge></div><div className="mt-5 space-y-3">{questions.isLoading ? <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">Sorular yükleniyor...</div> : (questions.data ?? []).length ? questions.data?.map(item => <div key={item.id} className="rounded-xl border border-[#eef0eb] px-4 py-3"><div className="flex items-start justify-between gap-4"><p className="text-sm font-semibold text-[#3b586a]">{item.prompt}</p><Badge variant="outline" className="shrink-0 text-[10px]">{item.status === "approved" ? "Onaylı" : "Taslak"}</Badge></div><p className="mt-2 text-xs text-[#819095]">{item.questionType === "multiple-choice" ? "Çoktan seçmeli" : item.questionType === "true-false" ? "Doğru - yanlış" : "Açık uçlu"} · {item.difficulty === "easy" ? "Kolay" : item.difficulty === "hard" ? "Zor" : "Orta"}</p></div>) : <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm leading-6 text-[#728087]">Henüz soru bulunmuyor. Soldaki formdan veya AI Oluşturucu alanından ilk soru taslağını ekleyebilirsiniz.</div>}</div></div></section>}

      {section === "ai" && <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8e4f7] text-[#68558e]"><BrainCircuit size={20} /></span><div><h2 className="font-bold text-[#29465a]">AI ile soru oluştur</h2><p className="text-xs text-[#71838b]">Soru önce taslak olarak kaydedilir.</p></div></div>{isAllowed("Soru Havuzu") ? <div className="mt-6 space-y-4"><div className="space-y-2"><Label htmlFor="aiTopic">Konu veya kazanım</Label><Input id="aiTopic" value={aiTopic} onChange={event => setAiTopic(event.target.value)} placeholder="Örn. 1. sınıf Türkçe: heceleme" className="h-11 rounded-xl" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Soru türü</Label><select value={questionType} onChange={event => setQuestionType(event.target.value as typeof questionType)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="multiple-choice">Çoktan seçmeli</option><option value="true-false">Doğru - yanlış</option><option value="open-ended">Açık uçlu</option></select></div><div className="space-y-2"><Label>Zorluk</Label><select value={questionDifficulty} onChange={event => setQuestionDifficulty(event.target.value as typeof questionDifficulty)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="easy">Kolay</option><option value="medium">Orta</option><option value="hard">Zor</option></select></div></div><Button disabled={aiTopic.trim().length < 3 || aiQuestion.isPending} onClick={() => aiQuestion.mutate({ topic: aiTopic, questionType, difficulty: questionDifficulty })} className="w-full rounded-xl bg-[#18344f]">{aiQuestion.isPending ? "Soru üretiliyor..." : "AI ile taslak üret"}<Sparkles size={16} /></Button></div> : <RestrictedNotice />}</div><div className="rounded-[24px] bg-[#18344f] p-6 text-white"><p className="text-xs font-bold tracking-[.16em] text-[#a5cac0] uppercase">Güvenli iş akışı</p><h2 className="mt-4 text-2xl font-semibold tracking-[-.04em]">Üretilen soru doğrudan yayınlanmaz.</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#c8d4d6]">Yapay zekâ çıktısı önce Soru Havuzu'na taslak olarak eklenir. Admin, Öğretmen veya Moderatör gerekli denetimden sonra kullanıma alabilir.</p><div className="mt-7 space-y-3">{["Konu ve türü belirle", "Yapılandırılmış taslak üret", "Soru havuzunda kontrol et", "Onay sonrası testte kullan"].map((item, index) => <div className="flex items-center gap-3 rounded-xl bg-white/9 px-4 py-3 text-sm font-semibold" key={item}><span className="text-[#f3d07b]">0{index + 1}</span>{item}</div>)}</div></div></section>}

      {section === "icerikler" && <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0ebf5] text-[#3b6987]"><BookOpenCheck size={20} /></span><div><h2 className="font-bold text-[#29465a]">Yeni içerik</h2><p className="text-xs text-[#71838b]">İçerik türünü seçerek taslak oluşturun.</p></div></div><div className="mt-6 space-y-4"><div className="space-y-2"><Label>İçerik türü</Label><select value={contentType} onChange={event => setContentType(event.target.value as typeof contentType)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="test">Testler</option><option value="document">Dokümanlar</option><option value="simulation">Simülasyonlar</option><option value="video">Videolar</option><option value="game">Oyunlar</option><option value="news">Haberler</option></select></div><div className="space-y-2"><Label>Kategori</Label><select value={contentCategoryId} onChange={event => setContentCategoryId(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Kategori seçin (isteğe bağlı)</option>{(categoryNodes.data ?? []).filter(item => item.categoryType === "institution" ? item.isActive : true).map(item => <option key={item.id} value={item.id}>{item.categoryType === "education" ? "Eğitim" : "Kurum"} · {item.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="contentTitle">Başlık</Label><Input id="contentTitle" value={contentTitle} onChange={event => setContentTitle(event.target.value)} placeholder="İçeriğin başlığı" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="contentSummary">Kısa açıklama</Label><Textarea id="contentSummary" value={contentSummary} onChange={event => setContentSummary(event.target.value)} placeholder="İçeriğin ne sunduğunu açıklayın." className="min-h-25 rounded-xl" /></div><Button disabled={contentTitle.trim().length < 3 || createContent.isPending} onClick={() => createContent.mutate({ title: contentTitle, contentType, summary: contentSummary, categoryId: contentCategoryId ? Number(contentCategoryId) : undefined })} className="w-full rounded-xl bg-[#18344f]">{createContent.isPending ? "Kaydediliyor..." : "İçerik taslağı oluştur"}<Plus size={16} /></Button></div></div><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><p className="text-sm font-bold text-[#29465a]">İçerik ilkeleri</p><div className="mt-5 space-y-3">{[["Testler", "Soru havuzundaki onaylı sorularla bağlanır."], ["Dokümanlar", "S3 bulut depolama alanına yüklenen dosyalarla ilişkilendirilir."], ["Videolar", "Güvenli video bağlantısı veya dosya ile sunulur."], ["Haberler", "Haber kategorileri altında düzenlenir."]].map(([name, text]) => <div key={name} className="rounded-xl bg-[#f7f8f4] p-4"><p className="text-sm font-bold text-[#496374]">{name}</p><p className="mt-1 text-xs leading-5 text-[#77878d]">{text}</p></div>)}</div></div></section>}

      {section === "icerikler" && <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">Haber kategorileri</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Haberler için bağımsız kategoriler oluşturun ve içerik düzenini koruyun.</p>{isAdmin ? <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]"><div className="flex gap-2"><Input value={newsCategoryName} onChange={event => setNewsCategoryName(event.target.value)} placeholder="Örn. Eğitim gündemi" className="h-11 rounded-xl" /><Button disabled={newsCategoryName.trim().length < 2 || createNewsCategory.isPending} onClick={() => createNewsCategory.mutate({ name: newsCategoryName })} className="rounded-xl bg-[#18344f]">Ekle</Button></div><div className="flex flex-wrap gap-2">{(newsCategories.data ?? []).length ? newsCategories.data?.map(item => <Badge key={item.id} variant="outline" className="px-3 py-1.5">{item.name}</Badge>) : <span className="text-sm text-[#7b8b90]">Henüz haber kategorisi eklenmedi.</span>}</div></div> : <RestrictedNotice />}</section>}

      {section === "ayarlar" && <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">Panel izinleri</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#71838b]">Admin, Öğretmen ve Moderatör panellerinde hangi bölümlerin görüntüleneceğini burada bölüm bazında açıp kapatır.</p>{isAdmin ? <><div className="mt-6 flex gap-2"><Button onClick={() => setPermissionRole("teacher")} variant={permissionRole === "teacher" ? "default" : "outline"} className={permissionRole === "teacher" ? "bg-[#18344f]" : "rounded-xl"}>Öğretmen</Button><Button onClick={() => setPermissionRole("moderator")} variant={permissionRole === "moderator" ? "default" : "outline"} className={permissionRole === "moderator" ? "bg-[#18344f]" : "rounded-xl"}>Moderatör</Button></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{managedSections.map(name => <div key={name} className="flex items-center justify-between rounded-xl border border-[#edf0eb] px-4 py-3"><div><p className="text-sm font-semibold text-[#365368]">{name}</p><p className="mt-0.5 text-xs text-[#7b8b90]">{permissionRole === "teacher" ? "Öğretmen" : "Moderatör"} erişimi</p></div><Switch checked={activePermissions.get(name) ?? false} disabled={updatePermission.isPending} onCheckedChange={isEnabled => updatePermission.mutate({ role: permissionRole, section: name, isEnabled})} /></div>)}</div></> : <div className="mt-6 rounded-xl bg-[#f8f7f2] p-4 text-sm text-[#6f8085]">Bu ayarı değiştirmek için Admin rolü gerekir.</div>}</section>}

      {section === "ayarlar" && <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">SEO ve Google Search Console</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Doğrulama etiketi, ölçüm kimliği veya SEO açıklaması gibi yapılandırmaları kaydedin. Harici API bağlamak için Google yetkilendirmesi ayrıca gereklidir.</p><div className="mt-5 space-y-3"><Input value={settingValue} onChange={event => setSettingValue(event.target.value)} placeholder="Örn. google-site-verification=..." className="h-11 rounded-xl" /><Button disabled={!isAdmin || settingValue.trim().length < 2 || saveSetting.isPending} onClick={() => saveSetting.mutate({ settingKey: "search_console_verification", settingValue })} className="w-full rounded-xl bg-[#18344f]">{saveSetting.isPending ? "Kaydediliyor..." : "Search Console ayarını kaydet"}</Button></div></div><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">Reklam Alanı</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Google AdSense ve özel firma reklam kodlarını yayın öncesinde buradan yönetin.</p><div className="mt-5 space-y-2">{["AdSense yayıncı kimliği", "Ana sayfa özel firma alanı", "İçerik sayfası reklam alanı"].map(item => <div key={item} className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3"><span className="text-sm font-semibold text-[#496374]">{item}</span><Badge variant="outline">Yapılandırılabilir</Badge></div>)}<p className="pt-2 text-xs leading-5 text-[#7b8b90]">Kaydedilmiş ayar: {adminSettings.data?.some(item => item.settingKey === "search_console_verification") ? "Mevcut" : "Henüz yok"}</p></div></div></section>}

      {section === "ayarlar" && <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">Reklam yapılandırması</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">AdSense yayıncı kimliği ve özel firma HTML alanını yalnızca Admin kaydedebilir.</p><div className="mt-5 space-y-3"><Input value={adSensePublisherId} onChange={event => setAdSensePublisherId(event.target.value)} placeholder="ca-pub-..." className="h-11 rounded-xl" /><Button disabled={!isAdmin || adSensePublisherId.trim().length < 6 || saveSetting.isPending} onClick={() => saveSetting.mutate({ settingKey: "adsense_publisher_id", settingValue: adSensePublisherId })} className="w-full rounded-xl bg-[#18344f]">AdSense kimliğini kaydet</Button><Textarea value={customAdSnippet} onChange={event => setCustomAdSnippet(event.target.value)} placeholder="Özel firma reklam HTML kodu veya güvenli iframe URL'si" className="min-h-24 rounded-xl" /><Button disabled={!isAdmin || customAdSnippet.trim().length < 6 || saveSetting.isPending} onClick={() => saveSetting.mutate({ settingKey: "custom_home_ad", settingValue: customAdSnippet })} variant="outline" className="w-full rounded-xl">Özel reklam alanını kaydet</Button></div></div><div className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">Site haritası önizlemesi</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Yayınlanabilir içerik URL'leri bu listeden izlenir; yayınlanan alan adı eklendiğinde XML haritasına bağlanmaya hazırdır.</p><div className="mt-5 max-h-52 space-y-2 overflow-auto">{(overview.data?.content ?? []).length ? overview.data?.content.map(item => <div key={item.id} className="rounded-xl bg-[#f7f8f4] px-3 py-2 text-xs text-[#496374]">/icerik/{item.slug}</div>) : <div className="rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#7b8b90]">İçerik taslağı eklendikçe site haritası önizlemesi burada oluşur.</div>}</div></div></section>}

      {section === "uyeler" && <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-[#29465a]">Üye Yönetimi</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Kayıtlı kullanıcıların rol ve son giriş bilgilerini izleyin.</p></div><Badge className="border-0 bg-[#edf4ef] text-[#548073]">{adminUsers.data?.length ?? 0} kullanıcı</Badge></div>{isAdmin ? <div className="mt-6 divide-y divide-[#edf0eb] rounded-2xl border border-[#edf0eb]">{(adminUsers.data ?? []).map(member => <div key={member.id} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-sm font-bold text-[#365368]">{member.name ?? "İsimsiz kullanıcı"}</p><p className="mt-1 text-xs text-[#7b8b90]">{member.email ?? "E-posta yok"}</p></div><Badge variant="outline">{roleName[member.role]}</Badge></div>)}</div> : <RestrictedNotice />}</section>}

      {section === "istatistikler" && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Kayıtlı üye" value={String(adminUsers.data?.length ?? 0)} icon={Users} tone="bg-[#e0f2ea] text-[#276e61]" /><StatCard label="İçerik taslağı" value={String(overview.data?.content.length ?? 0)} icon={FileText} tone="bg-[#e0eaf5] text-[#386886]" /><StatCard label="Eğitim kategorisi" value={String(overview.data?.educationCategories.length ?? 0)} icon={FolderTree} tone="bg-[#f8edcf] text-[#9c7427]" /><StatCard label="Güvenlik kaydı" value={String(securityEvents.data?.length ?? 0)} icon={ShieldCheck} tone="bg-[#e7e5f8] text-[#62538d]" /></section>}

      {section === "guvenlik" && <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><h2 className="text-xl font-bold text-[#29465a]">Güvenlik Olayları</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Yüksek ve kritik olaylar Admin'e otomatik bildirilir.</p>{isAdmin ? <div className="mt-6 space-y-2">{(securityEvents.data ?? []).length ? securityEvents.data?.map(event => <div key={event.id} className="flex items-start justify-between gap-4 rounded-xl border border-[#edf0eb] px-4 py-3"><div><p className="text-sm font-bold text-[#365368]">{event.eventType}</p><p className="mt-1 text-xs text-[#7b8b90]">{event.description}</p></div><Badge variant="outline">{event.severity}</Badge></div>) : <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">Henüz kayıtlı güvenlik olayı yok.</div>}</div> : <RestrictedNotice />}</section>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Activity; tone: string }) {
  return <div className="rounded-[21px] border border-[#e6e6de] bg-white p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19} /></div><p className="mt-5 text-3xl font-semibold tracking-[-.05em] text-[#204058]">{value}</p><p className="mt-1 text-xs font-semibold text-[#778891]">{label}</p></div>;
}

function RestrictedNotice() {
  return <div className="mt-6 rounded-xl bg-[#f8f7f2] p-4 text-sm leading-6 text-[#6f8085]">Bu modül size açık değil. Admin, panel izinleri bölümünden erişimi açabilir.</div>;
}

export default function Panel() {
  return <DashboardLayout><PanelContent /></DashboardLayout>;
}
