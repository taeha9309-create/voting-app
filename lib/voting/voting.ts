import { createHash, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db/types";

export interface VotingConfig {
  /** 운영진이 같이 쓰는 운영자 비밀번호. 비어 있으면 아무도 로그인할 수 없다. */
  adminPassword: string;
}

/**
 * 투표 모듈. 투표 규칙은 모두 여기에 있다.
 * 현재 시각과 보는 사람은 인자로 받고, 시계나 쿠키를 직접 읽지 않는다.
 */
export function createVoting(db: Db, config: VotingConfig) {
  void db;

  return {
    /** 입력한 비밀번호가 운영자 비밀번호와 같은지 상수 시간으로 비교한다. */
    checkAdminPassword(input: string): boolean {
      if (!config.adminPassword) return false;
      return timingSafeEqual(sha256(input), sha256(config.adminPassword));
    },
  };
}

export type Voting = ReturnType<typeof createVoting>;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
