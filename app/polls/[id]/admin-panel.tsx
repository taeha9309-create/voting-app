"use client";

import { useActionState, useState } from "react";
import { changeClosesAt } from "@/app/admin/polls/actions";

interface Props {
  pollId: string;
  closed: boolean;
  /** 지금 마감 시각을 `<input type="datetime-local">` 값(한국 시간)으로. */
  closesAtInput: string;
}

/** 운영자에게만 보이는 투표 관리 영역. */
export function AdminPanel({ pollId, closed, closesAtInput }: Props) {
  return (
    <section className="card stack" aria-labelledby="admin-title">
      <h2 id="admin-title" className="section-title">
        운영자 관리
      </h2>
      {closed ? (
        <p className="muted text-sm">마감된 투표는 마감 시각을 바꿀 수 없습니다.</p>
      ) : (
        <ChangeClosesAtForm pollId={pollId} closesAtInput={closesAtInput} />
      )}
    </section>
  );
}

function ChangeClosesAtForm({ pollId, closesAtInput }: { pollId: string; closesAtInput: string }) {
  const [state, action, pending] = useActionState(changeClosesAt.bind(null, pollId), {});
  const [value, setValue] = useState(closesAtInput);

  return (
    <form action={action} className="stack gap-2">
      <label className="field">
        <span>마감 시각 바꾸기 (한국 시간)</span>
        <div className="flex flex-wrap gap-2">
          <input
            type="datetime-local"
            name="closesAt"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
          />
          <button type="submit" className="button" disabled={pending || value === closesAtInput}>
            {pending ? "바꾸는 중…" : "바꾸기"}
          </button>
        </div>
      </label>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.done && !state.error && value === closesAtInput && (
        <p role="status" className="text-sm muted">
          마감 시각을 바꿨습니다.
        </p>
      )}
    </form>
  );
}
