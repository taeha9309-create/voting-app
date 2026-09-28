"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { parseKst } from "@/lib/kst";
import { requireAdmin } from "@/lib/server/admin-session";
import { getVoting } from "@/lib/server/voting";
import { LIMITS, type ChangeClosesAtError, type CreatePollError } from "@/lib/voting/voting";

export type CreatePollState = { error?: string };

const MESSAGES: Record<CreatePollError, string> = {
  question_empty: "질문을 입력하세요.",
  question_too_long: `질문은 ${LIMITS.questionMaxLength}자까지 쓸 수 있습니다.`,
  too_few_options: `선택지는 ${LIMITS.minOptions}개 이상이어야 합니다.`,
  too_many_options: `선택지는 ${LIMITS.maxOptions}개까지 만들 수 있습니다.`,
  option_empty: "비어 있는 선택지가 있습니다.",
  option_too_long: `선택지는 ${LIMITS.optionMaxLength}자까지 쓸 수 있습니다.`,
  duplicate_option: "같은 이름의 선택지가 있습니다.",
  closes_at_invalid: "마감 시각을 입력하세요.",
  closes_at_not_future: "마감 시각은 지금보다 뒤여야 합니다.",
};

export async function createPoll(_prev: CreatePollState, formData: FormData): Promise<CreatePollState> {
  await requireAdmin();

  const result = await getVoting().createPoll(
    {
      question: String(formData.get("question") ?? ""),
      options: formData.getAll("option").map(String),
      closesAt: parseKst(String(formData.get("closesAt") ?? "")),
    },
    new Date(),
  );
  if (!result.ok) return { error: MESSAGES[result.error] };

  redirect(`/polls/${result.pollId}?created=1`);
}

export type ChangeClosesAtState = { error?: string; done?: boolean };

const CHANGE_MESSAGES: Record<ChangeClosesAtError, string> = {
  poll_not_found: "투표를 찾을 수 없습니다. 삭제되었을 수 있습니다.",
  poll_closed: "이미 마감된 투표는 마감 시각을 바꿀 수 없습니다.",
  closes_at_invalid: MESSAGES.closes_at_invalid,
  closes_at_not_future: MESSAGES.closes_at_not_future,
};

export async function changeClosesAt(
  pollId: string,
  _prev: ChangeClosesAtState,
  formData: FormData,
): Promise<ChangeClosesAtState> {
  await requireAdmin();

  const result = await getVoting().changeClosesAt(
    pollId,
    parseKst(String(formData.get("closesAt") ?? "")),
    new Date(),
  );
  if (!result.ok) return { error: CHANGE_MESSAGES[result.error] };

  refresh();
  return { done: true };
}

/** 확인 창은 화면에서 띄운다. 이미 지워진 투표여도 목록으로 돌아가면 된다. */
export async function deletePoll(pollId: string): Promise<void> {
  await requireAdmin();
  await getVoting().deletePoll(pollId);
  redirect("/");
}
