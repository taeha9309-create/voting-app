"use client";

import { useActionState } from "react";
import { vote } from "./actions";

interface Props {
  pollId: string;
  options: { id: string; label: string }[];
}

export function VoteForm({ pollId, options }: Props) {
  const [state, action, pending] = useActionState(vote.bind(null, pollId), {});

  return (
    <form action={action} className="card stack">
      <fieldset className="stack gap-2">
        <legend className="mb-2 text-sm font-medium muted">하나를 골라 표를 던지세요. 던진 표는 바꿀 수 없습니다.</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]"
            style={{ borderColor: "var(--border)" }}
          >
            <input type="radio" name="optionId" value={option.id} className="accent-[var(--accent)]" />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "던지는 중…" : "표 던지기"}
      </button>
    </form>
  );
}
