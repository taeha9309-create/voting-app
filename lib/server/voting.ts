import { neonDb } from "@/lib/db/neon";
import { applySchema } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createVoting, type Voting } from "@/lib/voting/voting";

let voting: Voting | undefined;

/** 배포 환경의 투표 모듈. DB 연결과 운영자 비밀번호를 환경변수에서 읽는다. */
export function getVoting(): Voting {
  voting ??= createVoting(appDb(), {
    adminPassword: process.env.ADMIN_PASSWORD ?? "",
  });
  return voting;
}

function appDb(): Db {
  if (process.env.DATABASE_URL || process.env.NODE_ENV === "production") return neonDb();
  return localPgliteDb();
}

/**
 * 개발 중 `DATABASE_URL`이 없으면 `.pglite/` 폴더의 로컬 Postgres(PGlite)를 쓴다.
 * Neon 계정 없이 `npm run dev`로 화면을 확인하기 위한 것이고, 배포에서는 쓰지 않는다.
 */
function localPgliteDb(): Db {
  const ready = (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(".pglite");
    const db: Db = { query: async (text, params) => (await pg.query(text, params)).rows as never };
    await applySchema(db);
    return db;
  })();
  return { query: async (text, params) => (await ready).query(text, params) };
}
