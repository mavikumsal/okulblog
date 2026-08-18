import { importEducationCurriculum } from "../server/db";

const result = await importEducationCurriculum({ createdBy: 1 });
console.log(JSON.stringify(result));
