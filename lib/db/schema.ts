import type { Db } from "./types";

/**
 * 투표·선택지·표 테이블. 테스트(PGlite)와 배포(Neon)에 같은 SQL을 적용한다.
 * 여러 번 적용해도 안전하도록 모두 `if not exists`로 만든다.
 */
export const SCHEMA_STATEMENTS = [
  `create table if not exists polls (
    id uuid primary key default gen_random_uuid(),
    question text not null,
    closes_at timestamptz not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists options (
    id uuid primary key default gen_random_uuid(),
    poll_id uuid not null references polls(id) on delete cascade,
    label text not null,
    position integer not null,
    unique (poll_id, label),
    unique (id, poll_id)
  )`,
  // (option_id, poll_id) 복합 외래 키로 "이 투표의 선택지"에만 표가 들어가게 한다.
  // (poll_id, voter_id) 기본 키가 한 브라우저 한 표를 보장한다(ADR 0001).
  `create table if not exists votes (
    poll_id uuid not null references polls(id) on delete cascade,
    option_id uuid not null,
    voter_id uuid not null,
    cast_at timestamptz not null default now(),
    primary key (poll_id, voter_id),
    foreign key (option_id, poll_id) references options(id, poll_id) on delete cascade
  )`,
];

export async function applySchema(db: Db): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.query(statement);
  }
}
