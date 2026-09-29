// ADR 0001: 한 브라우저를 한 명의 동아리원으로 본다. 식별값은 앱 전체에 하나다.
// Proxy와 Server Action이 같이 쓰므로 next/headers에 기대지 않는다.

export const VOTER_COOKIE = "voter_id";

export const VOTER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
} as const;
