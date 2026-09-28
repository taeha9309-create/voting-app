import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// ADR 0001: 한 브라우저를 한 명의 동아리원으로 본다. 식별값은 앱 전체에 하나다.
const COOKIE = "voter_id";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 이 브라우저의 동아리원 식별값. 아직 표를 던진 적이 없거나 쿠키가 망가졌으면 null. */
export async function getVoterId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

/**
 * 표를 던질 때 쓸 식별값. 이미 있으면 그것을, 없으면 새로 만든다.
 * 새로 만든 값은 표가 실제로 들어간 뒤에 `rememberVoterId`로 쿠키에 남긴다.
 * (실패한 표에 쿠키를 먼저 발급하면 화면이 새로 그려져 실패 안내가 사라진다.)
 */
export async function voterIdForVote(): Promise<{ voterId: string; isNew: boolean }> {
  const existing = await getVoterId();
  return existing ? { voterId: existing, isNew: false } : { voterId: randomUUID(), isNew: true };
}

/** 새 동아리원 식별값을 쿠키에 남긴다. Server Action에서만 부른다. */
export async function rememberVoterId(voterId: string): Promise<void> {
  (await cookies()).set(COOKIE, voterId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
