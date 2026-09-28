// `npm run db:apply-schema`: .env.local의 DATABASE_URL(Neon)에 스키마를 적용한다.
import { neonDb } from "../lib/db/neon.ts";
import { applySchema } from "../lib/db/schema.ts";

await applySchema(neonDb());
console.log("스키마를 적용했습니다.");
