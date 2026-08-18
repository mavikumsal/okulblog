import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = fs.readFileSync(path, "utf8");
const startMarker = '        <section id="populer-kategoriler"';
const start = source.indexOf(startMarker);
if (start < 0) throw new Error("Popüler eğitim kategorileri bölümü bulunamadı");
const end = source.indexOf("</section>", start);
if (end < 0) throw new Error("Popüler eğitim kategorileri bölüm kapanışı bulunamadı");
const updated = source.slice(0, start) + source.slice(end + "</section>".length);
fs.writeFileSync(path, updated);
