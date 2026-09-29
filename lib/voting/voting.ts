import { createHash, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db/types";
import { isUuid } from "@/lib/uuid";

export interface VotingConfig {
  /** 운영진이 같이 쓰는 운영자 비밀번호. 비어 있으면 아무도 로그인할 수 없다. */
  adminPassword: string;
}

/** 투표를 보는 사람. 운영자의 브라우저도 동아리원 식별값을 가질 수 있다. */
export interface Viewer {
  /** 이 브라우저의 동아리원 식별값. 아직 표를 던진 적이 없으면 null. */
  voterId: string | null;
  isAdmin: boolean;
}

export interface NewPoll {
  question: string;
  options: string[];
  closesAt: Date;
}

export const LIMITS = {
  questionMaxLength: 200,
  optionMaxLength: 100,
  minOptions: 2,
  maxOptions: 10,
} as const;

export type CreatePollError =
  | "question_empty"
  | "question_too_long"
  | "too_few_options"
  | "too_many_options"
  | "option_empty"
  | "option_too_long"
  | "duplicate_option"
  | "closes_at_invalid"
  | "closes_at_not_future";

export type CreatePollResult = { ok: true; pollId: string } | { ok: false; error: CreatePollError };

export interface PollView {
  id: string;
  question: string;
  closesAt: Date;
  closed: boolean;
  options: { id: string; label: string }[];
  /** 이 동아리원이 고른 선택지 식별값. 아직 표를 던지지 않았으면 null. */
  myChoice: string | null;
  /** 결과를 볼 수 있을 때만 있다. 볼 수 없으면 키 자체가 없다. */
  results?: Results;
}

export interface Results {
  total: number;
  options: {
    optionId: string;
    label: string;
    votes: number;
    /** 정수 %로 반올림한 비율. 합이 정확히 100이 아닐 수 있다. */
    percent: number;
    /** 가장 많은 표를 받은 선택지인가. 동점이면 모두, 전체 0표면 아무것도 아니다. */
    leading: boolean;
  }[];
}

export type CastVoteError = "poll_not_found" | "poll_closed" | "option_not_in_poll" | "already_voted";

export type CastVoteResult = { ok: true } | { ok: false; error: CastVoteError };

export type ChangeClosesAtError =
  | "poll_not_found"
  | "poll_closed"
  | "closes_at_invalid"
  | "closes_at_not_future";

export type ChangeClosesAtResult = { ok: true } | { ok: false; error: ChangeClosesAtError };

export type DeletePollResult = { ok: true } | { ok: false; error: "poll_not_found" };

export interface PollSummary {
  id: string;
  question: string;
  closesAt: Date;
  /** 이 동아리원이 이 투표에 표를 던졌는가. */
  voted: boolean;
}

export interface PollList {
  /** 진행 중인 투표. 마감 시각이 이른 순서. */
  open: PollSummary[];
  /** 마감된 투표. 마감 시각이 늦은(최근에 마감된) 순서. */
  closed: PollSummary[];
}

export type GetPollResult = { found: true; poll: PollView } | { found: false };

/**
 * 투표 모듈. 투표 규칙은 모두 여기에 있다.
 * 현재 시각과 보는 사람은 인자로 받고, 시계나 쿠키를 직접 읽지 않는다.
 */
export function createVoting(db: Db, config: VotingConfig) {
  return {
    /** 입력한 비밀번호가 운영자 비밀번호와 같은지 상수 시간으로 비교한다. */
    checkAdminPassword(input: string): boolean {
      if (!config.adminPassword) return false;
      return timingSafeEqual(sha256(input), sha256(config.adminPassword));
    },

    async createPoll(input: NewPoll, now: Date): Promise<CreatePollResult> {
      const question = input.question.trim();
      const options = input.options.map((option) => option.trim());
      const error = validateNewPoll(question, options, input.closesAt, now);
      if (error) return { ok: false, error };

      // 투표와 선택지를 한 문장으로 넣어서, 중간에 실패해도 반쪽짜리 투표가 남지 않게 한다.
      const [row] = await db.query<{ id: string }>(
        `with p as (
           insert into polls (question, closes_at) values ($1, $2) returning id
         ), o as (
           insert into options (poll_id, label, position)
           select p.id, t.label, t.ord - 1
           from p, unnest($3::text[]) with ordinality as t(label, ord)
         )
         select id from p`,
        [question, input.closesAt, options],
      );
      return { ok: true, pollId: row.id };
    },

    async castVote(pollId: string, optionId: string, voterId: string, now: Date): Promise<CastVoteResult> {
      if (!isUuid(pollId)) return { ok: false, error: "poll_not_found" };
      if (!isUuid(optionId)) return { ok: false, error: "option_not_in_poll" };

      // (poll_id, voter_id) 유일 제약에 부딪히면 넣지 않는다. 동시에 두 번 눌러도 한 표만 남는다.
      const inserted = await db.query(
        `insert into votes (poll_id, option_id, voter_id)
         select $1, $2, $3
         where exists (select 1 from options where id = $2 and poll_id = $1)
           and exists (select 1 from polls where id = $1 and closes_at > $4)
         on conflict (poll_id, voter_id) do nothing
         returning 1`,
        [pollId, optionId, voterId, now],
      );
      if (inserted.length > 0) return { ok: true };

      // 넣지 못했으면 왜 못 넣었는지 찾는다.
      const [row] = await db.query<{ has_option: boolean; closed: boolean }>(
        `select exists (select 1 from options where id = $2 and poll_id = $1) as has_option,
                closes_at <= $3 as closed
         from polls where id = $1`,
        [pollId, optionId, now],
      );
      if (!row) return { ok: false, error: "poll_not_found" };
      if (row.closed) return { ok: false, error: "poll_closed" };
      if (!row.has_option) return { ok: false, error: "option_not_in_poll" };
      return { ok: false, error: "already_voted" };
    },

    /** 마감 시각은 투표에서 바꿀 수 있는 유일한 값이며, 마감 전에만 바꿀 수 있다. */
    async changeClosesAt(pollId: string, closesAt: Date, now: Date): Promise<ChangeClosesAtResult> {
      if (!isUuid(pollId)) return { ok: false, error: "poll_not_found" };
      const error = validateClosesAt(closesAt, now);
      if (error) return { ok: false, error };

      const updated = await db.query(
        `update polls set closes_at = $2 where id = $1 and closes_at > $3 returning 1`,
        [pollId, closesAt, now],
      );
      if (updated.length > 0) return { ok: true };

      const [exists] = await db.query(`select 1 from polls where id = $1`, [pollId]);
      return { ok: false, error: exists ? "poll_closed" : "poll_not_found" };
    },

    /** 영구 삭제. 선택지와 표는 DB의 연쇄 삭제로 함께 지워진다. */
    async deletePoll(pollId: string): Promise<DeletePollResult> {
      if (!isUuid(pollId)) return { ok: false, error: "poll_not_found" };
      const deleted = await db.query(`delete from polls where id = $1 returning 1`, [pollId]);
      return deleted.length > 0 ? { ok: true } : { ok: false, error: "poll_not_found" };
    },

    async listPolls(viewer: Viewer, now: Date): Promise<PollList> {
      const voterId = viewer.voterId && isUuid(viewer.voterId) ? viewer.voterId : null;
      const rows = await db.query<{ id: string; question: string; closes_at: Date | string; voted: boolean }>(
        `select p.id, p.question, p.closes_at,
                exists (select 1 from votes v where v.poll_id = p.id and v.voter_id = $1) as voted
         from polls p
         order by p.closes_at`,
        [voterId],
      );
      const polls = rows.map((row) => ({
        id: row.id,
        question: row.question,
        closesAt: new Date(row.closes_at),
        voted: row.voted,
      }));
      return {
        open: polls.filter((poll) => poll.closesAt > now),
        closed: polls.filter((poll) => poll.closesAt <= now).reverse(),
      };
    },

    async getPoll(pollId: string, viewer: Viewer, now: Date): Promise<GetPollResult> {
      if (!isUuid(pollId)) return { found: false };
      const [poll] = await db.query<{ id: string; question: string; closes_at: Date | string }>(
        `select id, question, closes_at from polls where id = $1`,
        [pollId],
      );
      if (!poll) return { found: false };

      const options = await db.query<{ id: string; label: string; votes: number }>(
        `select o.id, o.label, count(v.voter_id)::int as votes
         from options o left join votes v on v.option_id = o.id
         where o.poll_id = $1
         group by o.id
         order by o.position`,
        [pollId],
      );
      const myChoice = viewer.voterId && isUuid(viewer.voterId)
        ? ((
            await db.query<{ option_id: string }>(
              `select option_id from votes where poll_id = $1 and voter_id = $2`,
              [pollId, viewer.voterId],
            )
          )[0]?.option_id ?? null)
        : null;

      const closesAt = new Date(poll.closes_at);
      const view: PollView = {
        id: poll.id,
        question: poll.question,
        closesAt,
        closed: now >= closesAt,
        options: options.map(({ id, label }) => ({ id, label })),
        myChoice,
      };
      // 결과 공개 규칙: 운영자이거나, 이 동아리원이 표를 던졌거나, 마감되었을 때만.
      if (viewer.isAdmin || myChoice !== null || view.closed) view.results = tally(options);
      return { found: true, poll: view };
    },
  };
}

export type Voting = ReturnType<typeof createVoting>;

function tally(options: { id: string; label: string; votes: number }[]): Results {
  const total = options.reduce((sum, option) => sum + option.votes, 0);
  const top = Math.max(...options.map((option) => option.votes));
  return {
    total,
    options: options.map((option) => ({
      optionId: option.id,
      label: option.label,
      votes: option.votes,
      percent: total === 0 ? 0 : Math.round((option.votes / total) * 100),
      leading: total > 0 && option.votes === top,
    })),
  };
}

function validateNewPoll(
  question: string,
  options: string[],
  closesAt: Date,
  now: Date,
): CreatePollError | null {
  if (!question) return "question_empty";
  if (question.length > LIMITS.questionMaxLength) return "question_too_long";
  if (options.length < LIMITS.minOptions) return "too_few_options";
  if (options.length > LIMITS.maxOptions) return "too_many_options";
  if (options.some((option) => !option)) return "option_empty";
  if (options.some((option) => option.length > LIMITS.optionMaxLength)) return "option_too_long";
  if (new Set(options).size !== options.length) return "duplicate_option";
  return validateClosesAt(closesAt, now);
}

function validateClosesAt(closesAt: Date, now: Date): "closes_at_invalid" | "closes_at_not_future" | null {
  if (Number.isNaN(closesAt.getTime())) return "closes_at_invalid";
  if (closesAt <= now) return "closes_at_not_future";
  return null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
