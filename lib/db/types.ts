/** 투표 모듈이 주입받는 SQL 연결. 배포에서는 Neon, 테스트에서는 PGlite. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}
