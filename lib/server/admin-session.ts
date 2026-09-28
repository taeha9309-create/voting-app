import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** 로그인에 성공한 운영자에게 서명된 세션 쿠키를 발급한다. Server Action에서만 부른다. */
export async function startAdminSession(): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
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

  const expected = Buffer.from(sign(`${role}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  return Number(expiresAt) > Date.now();
}

/** 운영자 전용 Server Action의 첫 줄에서 부른다. 운영자가 아니면 예외를 던진다. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("운영자만 할 수 있습니다.");
}

function sign(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 환경변수는 32자 이상이어야 합니다.");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
