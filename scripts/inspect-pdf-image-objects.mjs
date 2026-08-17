import fs from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
const file = process.argv[2];
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
  const page = await doc.getPage(pageNo);
  const ops = await page.getOperatorList();
  const ids = [...new Set(ops.argsArray.flatMap((args, index) => (ops.fnArray[index] === OPS.paintImageXObject ? [args?.[0]] : [])))].filter(Boolean);
  const objects = ids.map((id) => ({ id, object: page.objs.get(id) }));
  console.log(JSON.stringify({ page: pageNo, objects: objects.map(({ id, object }) => ({ id, width: object?.width, height: object?.height, kind: object?.kind, dataLength: object?.data?.length, dataType: object?.data?.constructor?.name })) }, null, 2));
}
