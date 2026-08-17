import { BookOpenCheck, BrainCircuit, CircleHelp, FileText, Gamepad2, MessageCircleQuestion, PlayCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuickItem = { label: string; description: string; route: string; icon: LucideIcon; tone: string };

const items: QuickItem[] = [
  { label: "Testler", description: "Soru havuzundan süreli test oluşturun.", route: "/panel/testler", icon: BookOpenCheck, tone: "bg-[#e0ebf5] text-[#3b6987]" },
  { label: "Dokümanlar", description: "PDF ve eğitim dosyalarını yayınlayın.", route: "/panel/dokumanlar", icon: FileText, tone: "bg-[#f8edcf] text-[#9c7427]" },
  { label: "Videolar", description: "Video bağlantısı veya medya dosyası ekleyin.", route: "/panel/videolar", icon: PlayCircle, tone: "bg-[#e0f2ea] text-[#276e61]" },
  { label: "Simülasyonlar", description: "Etkileşimli öğrenme içerikleri oluşturun.", route: "/panel/simulasyonlar", icon: BrainCircuit, tone: "bg-[#e7e5f8] text-[#62538d]" },
  { label: "Oyunlar", description: "Eğitsel oyun içeriklerini yönetin.", route: "/panel/oyunlar", icon: Gamepad2, tone: "bg-[#f8e4e0] text-[#a65345]" },
  { label: "Sorular", description: "Soru havuzunu düzenleyin ve filtreleyin.", route: "/panel/soru-havuzu", icon: CircleHelp, tone: "bg-[#e0eaf5] text-[#386886]" },
  { label: "Soru-Cevap", description: "Üye katkılarını ve moderasyonu yönetin.", route: "/panel/soru-cevap", icon: MessageCircleQuestion, tone: "bg-[#d9eee7] text-[#266b5d]" },
];

export default function ContentQuickStart({ onNavigate }: { onNavigate: (route: string) => void }) {
  return (
    <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-[#7b928f] uppercase">Hızlı başlangıç</p>
          <h2 className="mt-2 text-xl font-bold text-[#29465a]">İçerik türünü seçin</h2>
          <p className="mt-1 text-sm leading-6 text-[#71838b]">Her içerik türü kendi yönetim ekranından oluşturulur ve Eğitim kategorisiyle ilişkilendirilir.</p>
        </div>
        <span className="text-xs font-semibold text-[#7b928f]">7 temel bölüm</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <Button key={item.label} variant="outline" onClick={() => onNavigate(item.route)} className="h-auto min-h-27 items-start justify-start gap-3 rounded-2xl border-[#e9eee9] bg-[#fbfcf8] p-4 text-left hover:border-[#c8ddd5] hover:bg-[#f5faf6]">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.tone}`}><Icon size={19} /></span>
              <span className="min-w-0"><span className="block text-sm font-bold text-[#365368]">{item.label}</span><span className="mt-1 block text-xs font-normal leading-5 text-[#7a898f]">{item.description}</span></span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
