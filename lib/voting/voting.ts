import { createHash, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db/types";

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

    async getPoll(pollId: string, viewer: Viewer, now: Date): Promise<GetPollResult> {
      void viewer;
      if (!isUuid(pollId)) return { found: false };
      const [poll] = await db.query<{ id: string; question: string; closes_at: Date | string }>(
        `select id, question, closes_at from polls where id = $1`,
        [pollId],
      );
      if (!poll) return { found: false };

      const options = await db.query<{ id: string; label: string }>(
        `select id, label from options where poll_id = $1 order by position`,
        [pollId],
      );
      const closesAt = new Date(poll.closes_at);
      return {
        found: true,
        poll: {
          id: poll.id,
          question: poll.question,
          closesAt,
          closed: now >= closesAt,
          options,
        },
      };
    },
  };
}

export type Voting = ReturnType<typeof createVoting>;

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
  if (Number.isNaN(closesAt.getTime())) return "closes_at_invalid";
  if (closesAt <= now) return "closes_at_not_future";
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 링크에서 온 식별값이 UUID가 아니면 DB에 묻지 않는다(Postgres가 형 변환 오류를 낸다). */
function isUuid(value: string): boolean {
  return UUID.test(value);
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
