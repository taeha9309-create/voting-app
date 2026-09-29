import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/uuid";
import { VOTER_COOKIE, VOTER_COOKIE_OPTIONS } from "@/lib/voter-cookie";

/**
 * 처음 방문한 브라우저에 동아리원 식별값을 미리 발급한다.
 * 표를 던질 때 발급하면, 쿠키 없는 브라우저가 거의 동시에 두 번 제출했을 때
 * 요청마다 다른 식별값이 생겨 두 표가 들어갈 수 있다.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(VOTER_COOKIE)?.value;
  if (existing && isUuid(existing)) return NextResponse.next();

  const voterId = crypto.randomUUID();
  // 이번 요청을 처리하는 페이지와 Server Action도 새 식별값을 보게 한다.
  request.cookies.set(VOTER_COOKIE, voterId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(VOTER_COOKIE, voterId, VOTER_COOKIE_OPTIONS);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
