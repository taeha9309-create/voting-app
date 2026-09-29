import Link from "next/link";
import { formatKst } from "@/lib/kst";
import { isAdmin } from "@/lib/server/admin-session";
import { getVoterId } from "@/lib/server/voter";
import { getVoting } from "@/lib/server/voting";
import type { PollSummary } from "@/lib/voting/voting";

export default async function Home() {
  const [admin, voterId] = await Promise.all([isAdmin(), getVoterId()]);
  const { open, closed } = await getVoting().listPolls({ voterId, isAdmin: admin }, new Date());

  return (
    <main className="page">
      <h1 className="page-title">투표</h1>

      {open.length === 0 && closed.length === 0 ? (
        <div className="card stack items-start">
          <p>아직 투표가 없습니다.</p>
          {admin && (
            <Link href="/admin/polls/new" className="button primary">
              첫 투표 만들기
            </Link>
          )}
        </div>
      ) : (
        <>
          <PollSection title="진행 중" polls={open} closed={false} empty="진행 중인 투표가 없습니다." />
          <PollSection title="마감" polls={closed} closed empty="마감된 투표가 없습니다." />
        </>
      )}
    </main>
  );
}

function PollSection({
  title,
  polls,
  closed,
  empty,
}: {
  title: string;
  polls: PollSummary[];
  closed: boolean;
  empty: string;
}) {
  return (
    <section className="stack gap-3" aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="section-title">
        {title} <span className="muted text-sm font-normal">{polls.length}</span>
      </h2>
      {polls.length === 0 ? (
        <p className="muted text-sm">{empty}</p>
      ) : (
        <ul className="stack gap-2">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Link
                href={`/polls/${poll.id}`}
                className="card flex items-center justify-between gap-3 py-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold">{poll.question}</span>
                  <span className="muted text-sm">
                    {closed ? "마감됨" : "마감"}: {formatKst(poll.closesAt)}
                  </span>
                </div>
                {poll.voted ? (
                  <span className="badge open shrink-0">표 던짐</span>
                ) : (
                  !closed && <span className="badge shrink-0">아직 안 던짐</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
