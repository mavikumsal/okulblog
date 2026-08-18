import fs from "node:fs";

const path = new URL("../client/src/pages/Home.tsx", import.meta.url);
const source = fs.readFileSync(path, "utf8");
const start = source.indexOf('<section id="sinavlar"');
if (start === -1) throw new Error("Kurum Kategorisi section bulunamadı");
const end = source.indexOf('</section>', start);
if (end === -1) throw new Error("Kurum Kategorisi section kapanışı bulunamadı");
const updated = `${source.slice(0, start)}${source.slice(end + '</section>'.length)}`;
fs.writeFileSync(path, updated);
console.log("Kurum Kategorisi section kaldırıldı.");
