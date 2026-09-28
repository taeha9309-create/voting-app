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
