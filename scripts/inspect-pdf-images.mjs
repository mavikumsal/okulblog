import fs from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
const file = process.argv[2];
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
  const page = await doc.getPage(pageNo);
  const ops = await page.getOperatorList();
  const imageIndexes = ops.fnArray.map((fn, index) => ({ fn, index })).filter(({ fn }) => fn === OPS.paintImageXObject || fn === OPS.paintXObject);
  console.log(JSON.stringify({ page: pageNo, imageIndexes, args: imageIndexes.map(({ index }) => ops.argsArray[index]) }, null, 2));
}
