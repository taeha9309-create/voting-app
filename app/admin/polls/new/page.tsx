import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/server/admin-session";
import { NewPollForm } from "./new-poll-form";

export const metadata: Metadata = { title: "투표 만들기" };

export default async function NewPollPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <main className="page">
      <h1 className="page-title">투표 만들기</h1>
      <p className="muted">만든 뒤에는 질문과 선택지를 바꿀 수 없습니다. 마감 시각은 마감 전까지 바꿀 수 있습니다.</p>
      <NewPollForm />
    </main>
  );
}
