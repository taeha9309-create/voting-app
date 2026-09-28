import { PGlite } from "@electric-sql/pglite";
import { applySchema } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** 테스트마다 새 인메모리 Postgres(PGlite)를 만들고 스키마를 적용한다. */
export async function freshDb(): Promise<Db> {
  const pg = new PGlite();
  const db: Db = {
    query: async (text, params) => (await pg.query(text, params)).rows as never,
  };
  await applySchema(db);
  return db;
}
