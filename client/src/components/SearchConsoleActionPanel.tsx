import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, ExternalLink, Upload } from "lucide-react";

type ActionResult = unknown;
type ActionMutation = {
  mutate: (input: {
    action: "submit-sitemap" | "performance";
    siteUrl: string;
    sitemap?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  isPending?: boolean;
  data?: ActionResult;
};

export default function SearchConsoleActionPanel({
  propertyUrl,
  mutation,
}: {
  propertyUrl?: string | null;
  mutation: ActionMutation;
}) {
  const [sitemap, setSitemap] = useState("sitemap.xml");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 28);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const siteUrl = propertyUrl ?? "";
  const resultText = mutation.data ? JSON.stringify(mutation.data, null, 2) : "";

  return (
    <section className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">Search Console işlemleri</p>
          <h2 className="mt-2 text-xl font-bold text-[#29465a]">Sitemap ve performans raporları</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#708188]">OAuth bağlantısı kurulduktan sonra sitemap gönderebilir ve son 28 günlük arama performansını panelde görüntüleyebilirsiniz.</p>
        </div>
        <Badge className={siteUrl ? "border-0 bg-[#e3f2e9] text-[#4f806d]" : "border-0 bg-[#fff3d8] text-[#9a742d]"}>{siteUrl ? "Mülk hazır" : "Önce mülk bağlayın"}</Badge>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor="search-console-sitemap">Sitemap yolu veya URL’si</Label>
          <Input id="search-console-sitemap" value={sitemap} onChange={event => setSitemap(event.target.value)} placeholder="sitemap.xml" className="mt-2" />
        </div>
        <Button className="self-end bg-[#1f6b60] text-white hover:bg-[#18584f]" disabled={!siteUrl || !sitemap.trim() || mutation.isPending} onClick={() => mutation.mutate({ action: "submit-sitemap", siteUrl, sitemap: sitemap.trim() })}>
          <Upload size={16} /> Sitemap gönder
        </Button>
      </div>
      <div className="mt-6 border-t border-[#edf0e9] pt-5">
        <div className="flex items-center gap-2 text-sm font-bold text-[#365368]"><Activity size={17} className="text-[#568d80]" /> Performans raporu</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div><Label htmlFor="search-console-start-date">Başlangıç</Label><Input id="search-console-start-date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-2" /></div>
          <div><Label htmlFor="search-console-end-date">Bitiş</Label><Input id="search-console-end-date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-2" /></div>
          <Button variant="outline" disabled={!siteUrl || mutation.isPending} onClick={() => mutation.mutate({ action: "performance", siteUrl, startDate, endDate })}><Activity size={16} /> Raporu getir</Button>
        </div>
      </div>
      {mutation.isPending && <p className="mt-4 text-sm text-[#708188]">Google Search Console yanıtı bekleniyor…</p>}
      {resultText && <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-[#f7f8f4] p-4 text-xs leading-5 text-[#365368]">{resultText}</pre>}
      {!siteUrl && <p className="mt-4 flex items-center gap-2 text-xs text-[#9a742d]"><ExternalLink size={14} /> OAuth bağlantısından sonra mülk URL’si otomatik kullanılabilir.</p>}
    </section>
  );
}
