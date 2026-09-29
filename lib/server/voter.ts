import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { isUuid } from "@/lib/uuid";
import { VOTER_COOKIE, VOTER_COOKIE_OPTIONS } from "@/lib/voter-cookie";

/** 이 브라우저의 동아리원 식별값. 보통 Proxy가 첫 방문 때 발급해 둔다. 없거나 망가졌으면 null. */
export async function getVoterId(): Promise<string | null> {
  const value = (await cookies()).get(VOTER_COOKIE)?.value;
  return value && isUuid(value) ? value : null;
}

/**
 * 표를 던질 때 쓸 식별값. Proxy를 거치지 않은 요청처럼 식별값이 없으면 새로 만든다.
 * 새로 만든 값은 표가 실제로 들어간 뒤에 `rememberVoterId`로 쿠키에 남긴다.
 * (실패한 표에 쿠키를 먼저 발급하면 화면이 새로 그려져 실패 안내가 사라진다.)
 */
export async function voterIdForVote(): Promise<{ voterId: string; isNew: boolean }> {
  const existing = await getVoterId();
  return existing ? { voterId: existing, isNew: false } : { voterId: randomUUID(), isNew: true };
}

/** 새 동아리원 식별값을 쿠키에 남긴다. Server Action에서만 부른다. */
export async function rememberVoterId(voterId: string): Promise<void> {
  (await cookies()).set(VOTER_COOKIE, voterId, VOTER_COOKIE_OPTIONS);
}
