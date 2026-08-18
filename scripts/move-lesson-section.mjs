import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = fs.readFileSync(path, "utf8");
const startMarker = '        <section id="icerikler"';
const insertMarker = '        <section id="baslangic"';
const start = source.indexOf(startMarker);
if (start < 0) throw new Error("Dersleri Keşfet bölümü bulunamadı");
const end = source.indexOf("</section>", start);
if (end < 0) throw new Error("Dersleri Keşfet bölüm kapanışı bulunamadı");
const section = source.slice(start, end + "</section>".length);
const withoutSection = source.slice(0, start) + source.slice(end + "</section>".length);
const insertAt = withoutSection.indexOf(insertMarker);
if (insertAt < 0) throw new Error("Hero başlangıç bölümü bulunamadı");
const updated = withoutSection.slice(0, insertAt) + section + "\n\n" + withoutSection.slice(insertAt);
fs.writeFileSync(path, updated);
