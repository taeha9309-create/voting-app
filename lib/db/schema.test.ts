import { describe, expect, it } from "vitest";
import { applySchema } from "@/lib/db/schema";
import { freshDb } from "@/test/fresh-db";

describe("스키마", () => {
  it("이미 적용된 DB에 다시 적용해도 실패하지 않는다", async () => {
    const db = await freshDb();

    await expect(applySchema(db)).resolves.toBeUndefined();
  });
});
