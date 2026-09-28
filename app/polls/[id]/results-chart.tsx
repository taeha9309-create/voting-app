import type { Results } from "@/lib/voting/voting";

interface Props {
  results: Results;
  myChoice: string | null;
}

/**
 * 결과 가로 막대 그래프. 선택지끼리 표 수를 비교하기 좋고 긴 선택지 이름도 읽기 쉽다.
 * 막대 길이는 비율이고, 표 수와 비율은 글자로도 적는다. 가장 많이 받은 선택지는 강조색이다.
 */
export function ResultsChart({ results, myChoice }: Props) {
  return (
    <section className="card stack" aria-labelledby="results-title">
      <div className="flex items-baseline justify-between">
        <h2 id="results-title" className="section-title">
          결과
        </h2>
        <p className="muted text-sm">전체 {results.total}표</p>
      </div>
      <ul className="stack gap-3">
        {results.options.map((option) => (
          <li key={option.optionId} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={option.leading ? "font-bold" : ""}>
                {option.label}
                {option.optionId === myChoice && (
                  <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    내 선택
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums muted">
                {option.votes}표 · {option.percent}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full" style={{ background: "var(--border)" }} aria-hidden>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${option.percent}%`,
                  background: option.leading ? "var(--accent)" : "var(--bar)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
