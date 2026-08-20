import React, { useRef } from "react";
import { sanitizeRichText } from "@/components/SafeHtml";
import { Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Quote, Link2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  ariaLabel: string;
  testId: string;
  minHeight?: string;
};

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "justifyLeft" | "justifyCenter" | "justifyRight" | "formatBlock" | "createLink" | "undo" | "redo";

export default function RichTextEditor({ value, onChange, label, ariaLabel, testId, minHeight = "min-h-36" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const run = (command: Command, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    if (editorRef.current) onChange(sanitizeRichText(editorRef.current.innerHTML));
  };
  const toolbar = [
    ["Kalın", Bold, () => run("bold")], ["İtalik", Italic, () => run("italic")], ["Altı çizili", Underline, () => run("underline")],
    ["Madde listesi", List, () => run("insertUnorderedList")], ["Numaralı liste", ListOrdered, () => run("insertOrderedList")],
    ["Sola hizala", AlignLeft, () => run("justifyLeft")], ["Ortala", AlignCenter, () => run("justifyCenter")], ["Sağa hizala", AlignRight, () => run("justifyRight")],
    ["Alıntı", Quote, () => run("formatBlock", "blockquote")], ["Geri al", Undo2, () => run("undo")], ["İleri al", Redo2, () => run("redo")],
  ] as const;
  return <div className="space-y-2"><label className="text-sm font-medium text-[#365368]">{label}</label><div className="overflow-hidden rounded-xl border border-input bg-white shadow-sm"><div className="flex flex-wrap items-center gap-1 border-b bg-[#f5f7f2] p-2" role="toolbar" aria-label={`${label} araç çubuğu`}><select aria-label={`${label} başlık seviyesi`} defaultValue="p" onChange={event => run("formatBlock", event.target.value)} className="h-8 rounded-md border border-[#dfe7df] bg-white px-2 text-xs text-[#365368]"><option value="p">Paragraf</option><option value="h2">Başlık 2</option><option value="h3">Başlık 3</option><option value="pre">Kod</option></select>{toolbar.map(([title, Icon, action]) => <button key={title} type="button" title={title} aria-label={title} onMouseDown={event => event.preventDefault()} onClick={action} className="grid h-8 w-8 place-items-center rounded-md text-[#55706d] transition hover:bg-white hover:text-[#18344f]" ><Icon size={15} /></button>)}<button type="button" title="Bağlantı ekle" aria-label="Bağlantı ekle" onClick={() => { const url = window.prompt("Bağlantı adresi"); if (url) run("createLink", url); }} onMouseDown={event => event.preventDefault()} className="grid h-8 w-8 place-items-center rounded-md text-[#55706d] transition hover:bg-white hover:text-[#18344f]"><Link2 size={15} /></button></div><div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label={ariaLabel} data-testid={testId} className={`${minHeight} max-h-72 overflow-y-auto p-4 text-sm leading-7 text-[#29465a] outline-none focus:bg-[#fdfefd]`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} onInput={event => onChange(sanitizeRichText(event.currentTarget.innerHTML))} /></div><p className="text-[11px] text-[#7d8c91]">Metni biçimlendirin, liste veya başlık ekleyin; içerik HTML olarak güvenli şekilde saklanır.</p></div>;
}
