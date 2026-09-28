import { PGlite, type PGliteInterface } from "@electric-sql/pglite";
import { applySchema } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

let template: Promise<PGliteInterface> | undefined;

/**
 * 테스트마다 서로 격리된 새 인메모리 Postgres(PGlite)를 돌려준다.
 * 스키마를 적용한 PGlite를 한 번 만들어 두고 복제해서 쓴다(매번 새로 띄우면 느리다).
 */
export async function freshDb(): Promise<Db> {
  template ??= (async () => {
    const pg = new PGlite();
    await applySchema(asDb(pg));
    return pg;
  })();
  return asDb(await (await template).clone());
}

function asDb(pg: PGliteInterface): Db {
  return { query: async (text, params) => (await pg.query(text, params)).rows as never };
}
