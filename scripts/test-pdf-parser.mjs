import fs from "node:fs";
import { parsePdfQuestions } from "../server/pdfQuestionParser.ts";
const file = process.argv[2];
const result = await parsePdfQuestions(fs.readFileSync(file), file);
console.log(JSON.stringify({ pageCount: result.pageCount, questionCount: result.questions.length, embeddedImages: result.questions.filter((question) => question.embeddedImageDataBase64).length, imageRoles: result.questions.reduce((acc, question) => { if (question.embeddedImageRole) acc[question.embeddedImageRole] = (acc[question.embeddedImageRole] ?? 0) + 1; return acc; }, {}) }, null, 2));
