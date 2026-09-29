const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 링크나 쿠키에서 온 식별값이 UUID 형식인가. 아니면 DB에 묻지 않는다(Postgres가 형 변환 오류를 낸다). */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
