import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = fs.readFileSync(path, "utf8");
const pattern = /\n\s*<section id="yolculuk"[\s\S]*?<\/section>\n/;
if (!pattern.test(source)) throw new Error("Çalışma düzeni section bulunamadı");
const next = source.replace(pattern, "\n");
fs.writeFileSync(path, next);
