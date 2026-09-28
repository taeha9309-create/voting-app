// 이 앱의 모든 시각은 한국 시간(Asia/Seoul, UTC+9, 서머타임 없음)으로 입력받고 보여준다.

/** `<input type="datetime-local">` 값("2026-10-01T18:00")을 한국 시간으로 해석한다. */
export function parseKst(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return new Date(NaN);
  return new Date(`${value}:00+09:00`);
}

/** `<input type="datetime-local">`에 넣을 한국 시간 값. */
export function toKstInputValue(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 화면에 보여줄 한국 시간. 예: "2026년 10월 1일 (목) 18:00" */
export function formatKst(date: Date): string {
  return formatter.format(date);
}
