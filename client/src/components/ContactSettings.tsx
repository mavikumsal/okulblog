import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Setting = { settingKey: string; settingValue: string | null };
type Props = { isAdmin: boolean; settings?: Setting[]; save: (input: { settingKey: string; settingValue: string }) => void; pending?: boolean };
export default function ContactSettings({ isAdmin, settings = [], save, pending }: Props) {
  const get = (key: string, fallback = "") => settings.find(item => item.settingKey === key)?.settingValue ?? fallback;
  const [enabled, setEnabled] = useState(get("contact_enabled", "true") !== "false");
  const [title, setTitle] = useState(get("contact_title", "Bize ulaşın"));
  const [description, setDescription] = useState(get("contact_description"));
  const [email, setEmail] = useState(get("contact_email"));
  const [phone, setPhone] = useState(get("contact_phone"));
  const [address, setAddress] = useState(get("contact_address"));
  useEffect(() => { setEnabled(get("contact_enabled", "true") !== "false"); setTitle(get("contact_title", "Bize ulaşın")); setDescription(get("contact_description")); setEmail(get("contact_email")); setPhone(get("contact_phone")); setAddress(get("contact_address")); }, [settings]);
  const submit = () => { [["contact_enabled", enabled ? "true" : "false"], ["contact_title", title], ["contact_description", description], ["contact_email", email], ["contact_phone", phone], ["contact_address", address]].forEach(([settingKey, settingValue]) => save({ settingKey, settingValue })); };
  return <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">Ana sayfa iletişim</p><h2 className="mt-2 text-xl font-bold text-[#29465a]">Bize Ulaşın alanı</h2><p className="mt-2 text-sm leading-6 text-[#71838b]">Ana sayfadaki iletişim kartının metinlerini ve görünürlüğünü yönetin.</p></div><Label className="flex items-center gap-2 text-xs font-bold text-[#496374]">Aktif <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!isAdmin} /></Label></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input value={title} onChange={event => setTitle(event.target.value)} disabled={!isAdmin} placeholder="Başlık" className="rounded-xl" /><Input value={email} onChange={event => setEmail(event.target.value)} disabled={!isAdmin} placeholder="E-posta" className="rounded-xl" /><Input value={phone} onChange={event => setPhone(event.target.value)} disabled={!isAdmin} placeholder="Telefon" className="rounded-xl" /><Input value={address} onChange={event => setAddress(event.target.value)} disabled={!isAdmin} placeholder="Adres" className="rounded-xl" /></div><Textarea value={description} onChange={event => setDescription(event.target.value)} disabled={!isAdmin} placeholder="Kısa iletişim açıklaması" className="mt-3 min-h-24 rounded-xl" /><Button onClick={submit} disabled={!isAdmin || pending} className="mt-4 rounded-xl bg-[#18344f]">{pending ? "Kaydediliyor..." : "İletişim alanını kaydet"}</Button></section>;
}
