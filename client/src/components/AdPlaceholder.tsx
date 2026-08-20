import React from "react";
import { Megaphone } from "lucide-react";

type AdPlaceholderProps = {
  slot: string;
  label?: string;
  active?: boolean;
  className?: string;
};

/**
 * Raw ad script kabul etmez. Active slot yalnızca server-provided configuration
 * ile açılabilir; gerçek adsbygoogle yüklemesi yayın ortamı entegrasyonuna bırakılır.
 */
export function AdPlaceholder({ slot, label = "Reklam Alanı", active = false, className = "" }: AdPlaceholderProps) {
  return (
    <aside
      data-ad-slot={slot}
      aria-label={label}
      className={`my-6 flex min-h-[96px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9ddd9] bg-[#f5f6f3] px-4 py-6 text-center ${className}`}
    >
      {active ? (
        <div className="text-xs font-semibold text-[#6f7d7c]">AdSense alanı hazırlanıyor</div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-semibold text-[#9aa4a1]">
          <Megaphone size={15} aria-hidden="true" />
          <span>{label}</span>
        </div>
      )}
    </aside>
  );
}
