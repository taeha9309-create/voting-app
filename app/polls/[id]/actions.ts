"use server";

import { redirect } from "next/navigation";
import { ensureVoterId } from "@/lib/server/voter";
import { getVoting } from "@/lib/server/voting";
import type { CastVoteError } from "@/lib/voting/voting";

export type VoteState = { error?: string };

const MESSAGES: Record<CastVoteError, string> = {
  poll_not_found: "투표를 찾을 수 없습니다. 삭제되었을 수 있습니다.",
  option_not_in_poll: "선택지를 다시 골라 주세요.",
  already_voted: "이미 이 투표에 표를 던졌습니다.",
};

export async function vote(pollId: string, _prev: VoteState, formData: FormData): Promise<VoteState> {
  const optionId = formData.get("optionId");
  if (typeof optionId !== "string" || !optionId) return { error: "선택지를 하나 골라 주세요." };

  const result = await getVoting().castVote(pollId, optionId, await ensureVoterId(), new Date());
  if (!result.ok && result.error !== "already_voted") return { error: MESSAGES[result.error] };

  // 이미 표를 던졌으면 다시 보여줄 때 내 선택과 결과가 나온다.
  redirect(`/polls/${pollId}`);
}
