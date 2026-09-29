import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** `SESSION_SECRET`이 쓸 만하게(32자 이상) 설정되어 있는가. */
export function hasSessionSecret(): boolean {
  return sessionSecret() !== null;
}

/** 로그인에 성공한 운영자에게 서명된 세션 쿠키를 발급한다. Server Action에서만 부른다. */
export async function startAdminSession(): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = sign(payload);
  if (!signature) throw new Error("SESSION_SECRET 환경변수는 32자 이상이어야 합니다.");
  (await cookies()).set(COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** 지금 요청이 유효한(서명이 맞고 만료되지 않은) 운영자 세션을 갖고 있는가. */
export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;

  const [role, expiresAt, signature] = value.split(".");
  if (role !== "admin" || !expiresAt || !signature) return false;

  // 서명 비밀값이 잘못 설정되었으면 아무도 운영자로 인정하지 않는다(화면 전체가 오류로 뜨지 않게).
  const expectedSignature = sign(`${role}.${expiresAt}`);
  if (!expectedSignature) return false;
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  return Number(expiresAt) > Date.now();
}

/** 운영자 전용 Server Action의 첫 줄에서 부른다. 운영자가 아니면 예외를 던진다. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("운영자만 할 수 있습니다.");
}

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/** 서명 비밀값이 잘못 설정되었으면 null. */
function sign(payload: string): string | null {
  const secret = sessionSecret();
  return secret ? createHmac("sha256", secret).update(payload).digest("base64url") : null;
}
