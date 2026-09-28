import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// ADR 0001: 한 브라우저를 한 명의 동아리원으로 본다. 식별값은 앱 전체에 하나다.
const COOKIE = "voter_id";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** 이 브라우저의 동아리원 식별값. 아직 표를 던진 적이 없으면 null. */
export async function getVoterId(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** 표를 던질 때 부른다. 식별값이 없으면 새로 발급한다. Server Action에서만 부른다. */
export async function ensureVoterId(): Promise<string> {
  const existing = await getVoterId();
  if (existing) return existing;

  const voterId = randomUUID();
  (await cookies()).set(COOKIE, voterId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return voterId;
}
