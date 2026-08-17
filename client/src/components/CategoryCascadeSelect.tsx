import React, { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";

type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  categoryType: "education" | "institution";
  isActive: boolean;
  level: string;
};

type Props = {
  nodes: CategoryNode[];
  educationValue: string;
  institutionValue: string;
  onEducationChange: (value: string) => void;
  onInstitutionChange: (value: string) => void;
  compact?: boolean;
};

function categoryPath(node: CategoryNode, nodes: CategoryNode[]) {
  const names: string[] = [];
  let current: CategoryNode | undefined = node;
  const seen = new Set<number>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? nodes.find(item => item.id === current?.parentId) : undefined;
  }
  return names.join(" → ");
}

function SteppedSelect({ label, nodes, value, onChange, optional }: { label: string; nodes: CategoryNode[]; value: string; onChange: (value: string) => void; optional?: boolean }) {
  const [selections, setSelections] = useState<Record<number, string>>({});
  const selected = value ? nodes.find(node => node.id === Number(value)) : undefined;
  const roots = useMemo(() => nodes.filter(node => !node.parentId), [nodes]);
  const maxLevels = 6;
  const optionsAt = (level: number) => {
    const parentId = level === 0 ? null : Number(selections[level - 1] || 0);
    return nodes.filter(node => node.parentId === (parentId || null));
  };
  const choose = (level: number, next: string) => {
    const nextSelections = { ...selections, [level]: next };
    Object.keys(nextSelections).forEach(key => { if (Number(key) > level) delete nextSelections[Number(key)]; });
    setSelections(nextSelections);
    onChange(next);
  };
  return <div className="space-y-2"><Label>{label} {optional ? <span className="font-normal">(opsiyonel)</span> : <span className="text-[#b06b45]">· zorunlu</span>}</Label><div className="grid gap-2 sm:grid-cols-2"><select aria-label={`${label} ana grup`} value={selections[0] ?? (selected && !selected.parentId ? value : "")} onChange={event => choose(0, event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Ana grup seçin</option>{roots.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{Array.from({ length: maxLevels - 1 }, (_, level) => level + 1).filter(level => Boolean(selections[level - 1])).map(level => <select key={level} aria-label={`${label} alt kategori ${level}`} value={selections[level] ?? ""} onChange={event => choose(level, event.target.value)} disabled={!selections[level - 1]} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50"><option value="">Alt kategori seçin</option>{optionsAt(level).filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>)}</div>{selected && <p className="text-[11px] text-[#6f8187]">Seçim yolu: {categoryPath(selected, nodes)}</p>}</div>;
}

export default function CategoryCascadeSelect(props: Props) {
  const education = props.nodes.filter(node => node.categoryType === "education");
  const institution = props.nodes.filter(node => node.categoryType === "institution");
  return <div className={props.compact ? "space-y-3" : "space-y-4"}><SteppedSelect label="Eğitim kategorisi" nodes={education} value={props.educationValue} onChange={props.onEducationChange} /><SteppedSelect label="Kurum kategorisi" nodes={institution} value={props.institutionValue} onChange={props.onInstitutionChange} optional /></div>;
}
