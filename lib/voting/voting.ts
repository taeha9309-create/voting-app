import type { Db } from "@/lib/db/types";

/**
 * 투표 모듈. 투표 규칙은 모두 여기에 있다.
 * 현재 시각과 보는 사람은 인자로 받고, 시계나 쿠키를 직접 읽지 않는다.
 */
export function createVoting(db: Db) {
  void db;
  return {};
}

export type Voting = ReturnType<typeof createVoting>;
