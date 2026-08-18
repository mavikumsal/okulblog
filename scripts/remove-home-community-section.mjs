import fs from "node:fs";

const file = new URL("../client/src/pages/Home.tsx", import.meta.url);
const source = fs.readFileSync(file, "utf8");
const startMarker = '        <section id="soru-cevap"';
const endMarker = '        <section id="sss"';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start === -1 || end === -1 || end <= start) {
  throw new Error("Home içindeki soru-cevap/iletişim section sınırları bulunamadı.");
}

const next = source.slice(0, start) + source.slice(end);
fs.writeFileSync(file, next);
console.log("Home soru-cevap ve iletişim section'ı kaldırıldı.");
