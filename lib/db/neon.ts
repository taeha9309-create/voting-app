import { neon } from "@neondatabase/serverless";
import type { Db } from "./types";

/** `DATABASE_URL`의 Neon에 붙는 연결. 배포와 `npm run dev`에서 쓴다. */
export function neonDb(url = process.env.DATABASE_URL): Db {
  if (!url) throw new Error("DATABASE_URL 환경변수가 없습니다.");
  const sql = neon(url);
  return { query: (text, params) => sql.query(text, params) as never };
}
