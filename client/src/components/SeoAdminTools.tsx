import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { validateSeoFields } from "@shared/seo";

export function getSnippetStatus(value: string, limit: number) { return { length: value.length, over: value.length > limit }; }

function Counter({ value, limit }: { value: string; limit: number }) {
  const over = getSnippetStatus(value, limit).over;
  return <span className={over ? "text-red-600" : "text-slate-400"}>{value.length}/{limit}</span>;
}

export function SeoSnippetPreview({ initialTitle = "OkulBlog | Eğitim İçerikleri", initialDescription = "Sınıf, ders ve kazanımlara göre test, doküman ve eğitim içeriklerini keşfedin.", initialSlug = "ornek-icerik" }: { initialTitle?: string; initialDescription?: string; initialSlug?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [slug, setSlug] = useState(initialSlug);
  const validation = validateSeoFields({ title, description, slug });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="font-bold text-slate-800">Google Arama Önizlemesi</h3><p className="mt-1 text-xs text-slate-500">Başlık ve açıklamayı arama sonucunda yaklaşık görünümüyle kontrol edin.</p></div>
        <Search className="h-5 w-5 text-blue-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">SEO başlığı <span className="float-right"><Counter value={title} limit={60} /></span><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={70} className="mt-1" /></label>
          <label className="block text-xs font-semibold text-slate-600">Meta açıklaması <span className="float-right"><Counter value={description} limit={160} /></span><Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={180} className="mt-1 min-h-24" /></label>
          <label className="block text-xs font-semibold text-slate-600">Slug <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="mt-1" />{!validation.valid && <span className="mt-1 block text-[11px] text-red-600">{Object.values(validation.errors)[0]}</span>}</label>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="truncate text-sm text-[#1a0dab]">{title || "Sayfa başlığı"}</p>
          <p className="mt-1 truncate text-xs text-[#16803c]">okulblog.com/{slug || "ornek-icerik"}</p>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">{description || "Meta açıklaması burada görünecek."}</p>
        </div>
      </div>
    </section>
  );
}

export function SeoVerificationSettings({ settings, saveSetting }: { settings?: Array<{ settingKey: string; settingValue: string | null }>; saveSetting: { mutate: (input: { settingKey: string; settingValue: string }, opts?: any) => void; isPending: boolean } }) {
  const get = (key: string) => settings?.find(item => item.settingKey === key)?.settingValue ?? "";
  const [verification, setVerification] = useState(() => get("google_site_verification"));
  const [publisherId, setPublisherId] = useState(() => get("adsense_publisher_id"));
  const save = (settingKey: string, settingValue: string) => saveSetting.mutate({ settingKey, settingValue }, { onSuccess: () => toast.success("Ayar kaydedildi."), onError: (error: any) => toast.error(error?.message ?? "Ayar kaydedilemedi.") });
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between"><div><h3 className="font-bold text-slate-800">Google doğrulama ve yayıncı ayarları</h3><p className="mt-1 text-xs text-slate-500">Ham script yerine yalnızca doğrulanmış, güvenli değer alanları saklanır.</p></div><Save className="h-5 w-5 text-amber-600" /></div><div className="grid gap-4 md:grid-cols-2"><div><Label>Google site verification değeri</Label><div className="mt-1 flex gap-2"><Input value={verification} onChange={e => setVerification(e.target.value)} placeholder="meta etiketindeki content değeri" /><Button disabled={saveSetting.isPending} onClick={() => save("google_site_verification", verification)}><Save className="mr-1 h-4 w-4" />Kaydet</Button></div></div><div><Label>AdSense yayıncı kimliği</Label><div className="mt-1 flex gap-2"><Input value={publisherId} onChange={e => setPublisherId(e.target.value)} placeholder="pub-xxxxxxxxxxxxxxxx" /><Button disabled={saveSetting.isPending} onClick={() => save("adsense_publisher_id", publisherId)}><Save className="mr-1 h-4 w-4" />Kaydet</Button></div></div></div></section>;
}

export function filterIndexingQueueRows<T extends { status: string }>(rows: T[], filter: string) { return rows.filter(item => filter === "all" || item.status === filter); }

export function SearchIndexingQueuePanel() {
  const queueApi = (trpc.admin as any)?.searchIndexingQueue;
  const retryApi = (trpc.admin as any)?.retrySearchIndexing;
  if (!queueApi || !retryApi) return null;
  const utils = trpc.useUtils();
  const queue = queueApi.useQuery({ limit: 100 });
  const retry = retryApi.useMutation({ onSuccess: () => { toast.success("Kayıt yeniden kuyruğa alındı."); utils.admin.searchIndexingQueue.invalidate(); } });
  const [filter, setFilter] = useState("all");
  const rows = useMemo(() => filterIndexingQueueRows<any>(queue.data ?? [], filter), [queue.data, filter]);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-800">Google indeksleme kuyruğu</h3><p className="mt-1 text-xs text-slate-500">Yayınlanan içeriklerin sitemap/index durumunu ve hatalarını izleyin. {queue.data?.length ? `Son senkron: ${new Date(Math.max(...queue.data.map((item: any) => new Date(item.updatedAt ?? item.createdAt ?? 0).getTime()))).toLocaleString("tr-TR")}` : "Henüz senkron kaydı yok."}</p></div><Button variant="outline" onClick={() => queue.refetch()}><RefreshCw className="mr-1 h-4 w-4" />Yenile</Button></div><div className="mb-4 flex flex-wrap gap-2">{["all", "pending", "submitted", "failed", "skipped"].map(value => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>{value === "all" ? "Tümü" : value}</Button>)}</div><div className="space-y-2">{rows.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Kuyrukta gösterilecek kayıt yok.</p> : rows.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{item.url}</p><p className="text-xs text-slate-400">{item.entityType} · {item.attempts} deneme · {item.lastError ?? "Hata yok"}</p></div><div className="flex items-center gap-2"><Badge variant={item.status === "submitted" ? "default" : item.status === "failed" ? "destructive" : "secondary"}>{item.status}</Badge>{(item.status === "failed" || item.status === "skipped") && <Button size="sm" variant="outline" onClick={() => retry.mutate({ id: item.id })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Yeniden dene</Button>}</div></div>)}</div></section>;
}
