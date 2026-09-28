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
