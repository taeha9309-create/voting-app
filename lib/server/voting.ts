import { neonDb } from "@/lib/db/neon";
import { createVoting, type Voting } from "@/lib/voting/voting";

let voting: Voting | undefined;

/** 배포 환경의 투표 모듈. Neon 연결과 운영자 비밀번호를 환경변수에서 읽는다. */
export function getVoting(): Voting {
  voting ??= createVoting(neonDb(), {
    adminPassword: process.env.ADMIN_PASSWORD ?? "",
  });
  return voting;
}
