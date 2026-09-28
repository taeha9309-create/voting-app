import { describe, expect, it } from "vitest";
import { createVoting } from "@/lib/voting/voting";
import { freshDb } from "@/test/fresh-db";

const ADMIN_PASSWORD = "동아리비번123";

async function setup() {
  return createVoting(await freshDb(), { adminPassword: ADMIN_PASSWORD });
}

describe("운영자 비밀번호 확인하기", () => {
  it("맞는 비밀번호는 통과한다", async () => {
    const voting = await setup();

    expect(voting.checkAdminPassword("동아리비번123")).toBe(true);
  });

  it("틀린 비밀번호는 거절한다", async () => {
    const voting = await setup();

    expect(voting.checkAdminPassword("동아리비번12")).toBe(false);
    expect(voting.checkAdminPassword("동아리비번1234")).toBe(false);
  });

  it("빈 비밀번호는 거절한다", async () => {
    const voting = await setup();

    expect(voting.checkAdminPassword("")).toBe(false);
  });

  it("운영자 비밀번호가 설정되지 않았으면 무엇이든 거절한다", async () => {
    const voting = createVoting(await freshDb(), { adminPassword: "" });

    expect(voting.checkAdminPassword("")).toBe(false);
  });
});

const NOW = new Date("2026-10-01T09:00:00+09:00");
const TOMORROW = new Date("2026-10-02T09:00:00+09:00");
const MEMBER = { voterId: null, isAdmin: false };

describe("투표 만들기와 보기", () => {
  it("만든 투표를 질문과 입력한 순서대로의 선택지로 볼 수 있다", async () => {
    const voting = await setup();

    const created = await voting.createPoll(
      { question: "MT 장소는?", options: ["가평", "대부도", "춘천"], closesAt: TOMORROW },
      NOW,
    );
    if (!created.ok) throw new Error(created.error);
    const view = await voting.getPoll(created.pollId, MEMBER, NOW);

    expect(view).toMatchObject({
      found: true,
      poll: {
        question: "MT 장소는?",
        closesAt: TOMORROW,
        closed: false,
        options: [{ label: "가평" }, { label: "대부도" }, { label: "춘천" }],
      },
    });
  });

  it("없는 투표는 찾을 수 없다", async () => {
    const voting = await setup();

    expect(await voting.getPoll("00000000-0000-4000-8000-000000000000", MEMBER, NOW)).toEqual({
      found: false,
    });
  });

  it("식별값 형식이 아닌 링크도 찾을 수 없음으로 처리한다", async () => {
    const voting = await setup();

    expect(await voting.getPoll("not-a-poll", MEMBER, NOW)).toEqual({ found: false });
  });
});

describe("투표 만들기 검증", () => {
  it("질문과 선택지의 앞뒤 공백을 지우고 저장한다", async () => {
    const voting = await setup();

    const created = await voting.createPoll(
      { question: "  회식 메뉴는?  ", options: [" 치킨", "피자 "], closesAt: TOMORROW },
      NOW,
    );
    if (!created.ok) throw new Error(created.error);
    const view = await voting.getPoll(created.pollId, MEMBER, NOW);

    expect(view).toMatchObject({
      poll: { question: "회식 메뉴는?", options: [{ label: "치킨" }, { label: "피자" }] },
    });
  });

  const valid = { question: "회식 메뉴는?", options: ["치킨", "피자"], closesAt: TOMORROW };

  it.each([
    ["빈 질문", { ...valid, question: "   " }, "question_empty"],
    ["200자를 넘는 질문", { ...valid, question: "가".repeat(201) }, "question_too_long"],
    ["선택지 1개", { ...valid, options: ["치킨"] }, "too_few_options"],
    ["선택지 11개", { ...valid, options: Array.from({ length: 11 }, (_, i) => `선택지${i + 1}`) }, "too_many_options"],
    ["빈 선택지", { ...valid, options: ["치킨", "  "] }, "option_empty"],
    ["100자를 넘는 선택지", { ...valid, options: ["치킨", "가".repeat(101)] }, "option_too_long"],
    ["공백만 다른 중복 선택지", { ...valid, options: ["치킨", " 치킨 "] }, "duplicate_option"],
    ["지금 시각과 같은 마감 시각", { ...valid, closesAt: NOW }, "closes_at_not_future"],
    ["과거 마감 시각", { ...valid, closesAt: new Date("2026-09-30T09:00:00+09:00") }, "closes_at_not_future"],
    ["잘못된 마감 시각", { ...valid, closesAt: new Date("invalid") }, "closes_at_invalid"],
  ])("%s는 만들지 않고 사유를 돌려준다", async (_name, input, error) => {
    const voting = await setup();

    expect(await voting.createPoll(input, NOW)).toEqual({ ok: false, error });
  });

  it("선택지 2개와 10개는 만들 수 있다", async () => {
    const voting = await setup();
    const ten = Array.from({ length: 10 }, (_, i) => `선택지${i + 1}`);

    expect(await voting.createPoll({ ...valid, options: ["치킨", "피자"] }, NOW)).toMatchObject({ ok: true });
    expect(await voting.createPoll({ ...valid, options: ten }, NOW)).toMatchObject({ ok: true });
  });
});

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const CAROL = "33333333-3333-4333-8333-333333333333";
const member = (voterId: string | null) => ({ voterId, isAdmin: false });

/** 선택지 라벨로 선택지 식별값을 찾을 수 있게 투표를 하나 만든다. */
async function pollWith(voting: Awaited<ReturnType<typeof setup>>, options: string[]) {
  const created = await voting.createPoll({ question: "회식 메뉴는?", options, closesAt: TOMORROW }, NOW);
  if (!created.ok) throw new Error(created.error);
  const view = await voting.getPoll(created.pollId, member(null), NOW);
  if (!view.found) throw new Error("투표가 없습니다");
  const optionId = (label: string) => view.poll.options.find((o) => o.label === label)!.id;
  return { pollId: created.pollId, optionId };
}

describe("표 던지기", () => {
  it("표를 던지기 전에는 결과가 응답에 없다", async () => {
    const voting = await setup();
    const { pollId } = await pollWith(voting, ["치킨", "피자"]);

    const view = await voting.getPoll(pollId, member(ALICE), NOW);

    expect(view.found && view.poll.myChoice).toBeNull();
    expect(view.found && "results" in view.poll).toBe(false);
  });

  it("표를 던지면 내 선택과 결과를 본다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);

    expect(await voting.castVote(pollId, optionId("피자"), ALICE, NOW)).toEqual({ ok: true });
    const view = await voting.getPoll(pollId, member(ALICE), NOW);

    expect(view).toMatchObject({
      found: true,
      poll: {
        myChoice: optionId("피자"),
        results: {
          total: 1,
          options: [
            { label: "치킨", votes: 0, percent: 0, leading: false },
            { label: "피자", votes: 1, percent: 100, leading: true },
          ],
        },
      },
    });
  });
});

describe("한 브라우저 한 표", () => {
  it("같은 동아리원의 두 번째 표는 거절하고 첫 표를 유지한다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);
    await voting.castVote(pollId, optionId("치킨"), ALICE, NOW);

    expect(await voting.castVote(pollId, optionId("피자"), ALICE, NOW)).toEqual({
      ok: false,
      error: "already_voted",
    });
    const view = await voting.getPoll(pollId, member(ALICE), NOW);
    expect(view).toMatchObject({ poll: { myChoice: optionId("치킨"), results: { total: 1 } } });
  });

  it("다른 동아리원은 각자 한 표씩 던질 수 있다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);

    expect(await voting.castVote(pollId, optionId("치킨"), ALICE, NOW)).toEqual({ ok: true });
    expect(await voting.castVote(pollId, optionId("치킨"), BOB, NOW)).toEqual({ ok: true });
  });

  it("한 동아리원이 여러 투표에 각각 표를 던질 수 있다", async () => {
    const voting = await setup();
    const first = await pollWith(voting, ["치킨", "피자"]);
    const second = await pollWith(voting, ["가평", "춘천"]);

    expect(await voting.castVote(first.pollId, first.optionId("치킨"), ALICE, NOW)).toEqual({ ok: true });
    expect(await voting.castVote(second.pollId, second.optionId("춘천"), ALICE, NOW)).toEqual({ ok: true });
  });

  it("동시에 두 번 눌러도 한 표만 들어간다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);

    const results = await Promise.all([
      voting.castVote(pollId, optionId("치킨"), ALICE, NOW),
      voting.castVote(pollId, optionId("피자"), ALICE, NOW),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const view = await voting.getPoll(pollId, member(ALICE), NOW);
    expect(view).toMatchObject({ poll: { results: { total: 1 } } });
  });

  it("다른 투표의 선택지로는 표를 던질 수 없다", async () => {
    const voting = await setup();
    const first = await pollWith(voting, ["치킨", "피자"]);
    const second = await pollWith(voting, ["가평", "춘천"]);

    expect(await voting.castVote(first.pollId, second.optionId("가평"), ALICE, NOW)).toEqual({
      ok: false,
      error: "option_not_in_poll",
    });
  });

  it("없는 투표에는 표를 던질 수 없다", async () => {
    const voting = await setup();
    const { optionId } = await pollWith(voting, ["치킨", "피자"]);

    expect(
      await voting.castVote("00000000-0000-4000-8000-000000000000", optionId("치킨"), ALICE, NOW),
    ).toEqual({ ok: false, error: "poll_not_found" });
  });
});

describe("결과", () => {
  it("동점이면 가장 많이 받은 선택지를 모두 강조한다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자", "족발"]);
    await voting.castVote(pollId, optionId("치킨"), ALICE, NOW);
    await voting.castVote(pollId, optionId("피자"), BOB, NOW);

    const view = await voting.getPoll(pollId, member(ALICE), NOW);

    expect(view).toMatchObject({
      poll: {
        results: {
          total: 2,
          options: [
            { label: "치킨", votes: 1, percent: 50, leading: true },
            { label: "피자", votes: 1, percent: 50, leading: true },
            { label: "족발", votes: 0, percent: 0, leading: false },
          ],
        },
      },
    });
  });

  it("비율은 정수 %로 반올림한다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);
    await voting.castVote(pollId, optionId("치킨"), ALICE, NOW);
    await voting.castVote(pollId, optionId("치킨"), BOB, NOW);
    await voting.castVote(pollId, optionId("피자"), CAROL, NOW);

    const view = await voting.getPoll(pollId, member(ALICE), NOW);

    expect(view).toMatchObject({
      poll: {
        results: {
          total: 3,
          options: [
            { label: "치킨", votes: 2, percent: 67, leading: true },
            { label: "피자", votes: 1, percent: 33, leading: false },
          ],
        },
      },
    });
  });
});

describe("자동 마감", () => {
  const ONE_MINUTE_BEFORE = new Date(TOMORROW.getTime() - 60_000);

  it("마감 시각 1분 전에는 표를 받는다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);

    expect(await voting.castVote(pollId, optionId("치킨"), ALICE, ONE_MINUTE_BEFORE)).toEqual({ ok: true });
  });

  it("마감 시각 정각부터는 표를 받지 않는다", async () => {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);

    expect(await voting.castVote(pollId, optionId("치킨"), ALICE, TOMORROW)).toEqual({
      ok: false,
      error: "poll_closed",
    });
  });

  it("마감 시각이 지나면 투표가 마감된 것으로 보인다", async () => {
    const voting = await setup();
    const { pollId } = await pollWith(voting, ["치킨", "피자"]);

    expect(await voting.getPoll(pollId, member(ALICE), ONE_MINUTE_BEFORE)).toMatchObject({ poll: { closed: false } });
    expect(await voting.getPoll(pollId, member(ALICE), TOMORROW)).toMatchObject({ poll: { closed: true } });
  });
});

describe("결과 공개", () => {
  const AFTER_CLOSE = new Date(TOMORROW.getTime() + 60_000);

  /** 앨리스만 표를 던진 투표. */
  async function pollAliceVoted() {
    const voting = await setup();
    const { pollId, optionId } = await pollWith(voting, ["치킨", "피자"]);
    await voting.castVote(pollId, optionId("치킨"), ALICE, NOW);
    const seesResults = async (viewer: { voterId: string | null; isAdmin: boolean }, now: Date) => {
      const view = await voting.getPoll(pollId, viewer, now);
      return view.found && "results" in view.poll;
    };
    return seesResults;
  }

  it.each([
    { name: "운영자", viewer: { voterId: null, isAdmin: true }, now: NOW, visible: true },
    { name: "표를 던진 동아리원", viewer: member(ALICE), now: NOW, visible: true },
    { name: "표를 던지지 않은 동아리원", viewer: member(BOB), now: NOW, visible: false },
    { name: "식별값이 없는 동아리원", viewer: member(null), now: NOW, visible: false },
    { name: "마감 뒤 운영자", viewer: { voterId: null, isAdmin: true }, now: AFTER_CLOSE, visible: true },
    { name: "마감 뒤 표를 던진 동아리원", viewer: member(ALICE), now: AFTER_CLOSE, visible: true },
    { name: "마감 뒤 표를 던지지 않은 동아리원", viewer: member(BOB), now: AFTER_CLOSE, visible: true },
    { name: "마감 뒤 식별값이 없는 동아리원", viewer: member(null), now: AFTER_CLOSE, visible: true },
  ])("$name: 결과를 볼 수 있는가 → $visible", async ({ viewer, now, visible }) => {
    const seesResults = await pollAliceVoted();

    expect(await seesResults(viewer, now)).toBe(visible);
  });

  it("전체 0표로 마감된 투표는 모두 0표 0%이고 아무것도 강조하지 않는다", async () => {
    const voting = await setup();
    const { pollId } = await pollWith(voting, ["치킨", "피자"]);

    const view = await voting.getPoll(pollId, member(null), AFTER_CLOSE);

    expect(view).toMatchObject({
      poll: {
        results: {
          total: 0,
          options: [
            { label: "치킨", votes: 0, percent: 0, leading: false },
            { label: "피자", votes: 0, percent: 0, leading: false },
          ],
        },
      },
    });
  });
});
