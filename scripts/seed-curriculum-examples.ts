import { seedCurriculumExamples } from "../server/db";

const result = await seedCurriculumExamples({ createdBy: 1 });
console.log(JSON.stringify(result));
