import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatKst } from "@/lib/kst";
import { isAdmin } from "@/lib/server/admin-session";
import { getVoting } from "@/lib/server/voting";
import { CopyLink } from "./copy-link";

export async function generateMetadata(props: PageProps<"/polls/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getVoting().getPoll(id, { voterId: null, isAdmin: false }, new Date());
  return { title: result.found ? result.poll.question : "투표를 찾을 수 없음" };
}

export default async function PollPage(props: PageProps<"/polls/[id]">) {
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const admin = await isAdmin();

  const result = await getVoting().getPoll(id, { voterId: null, isAdmin: admin }, new Date());
  if (!result.found) notFound();
  const { poll } = result;

  return (
    <main className="page">
      {created && admin && (
        <div className="card stack" style={{ background: "var(--accent-soft)" }}>
          <p className="font-semibold">투표를 만들었습니다. 아래 링크를 단톡방에 공유하세요.</p>
          <CopyLink path={`/polls/${poll.id}`} />
        </div>
      )}

      <header className="stack gap-1">
        <h1 className="page-title">{poll.question}</h1>
        <p className="muted text-sm">마감: {formatKst(poll.closesAt)}</p>
      </header>

      <ol className="card stack gap-2">
        {poll.options.map((option) => (
          <li key={option.id}>{option.label}</li>
        ))}
      </ol>
    </main>
  );
}
