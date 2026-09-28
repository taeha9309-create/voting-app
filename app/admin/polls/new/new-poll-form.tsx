"use client";

import { useActionState, useState } from "react";
import { LIMITS } from "@/lib/voting/voting";
import { createPoll } from "../actions";

type OptionField = { key: number; value: string };

export function NewPollForm() {
  const [state, action, pending] = useActionState(createPoll, {});
  // 입력값을 상태로 들고 있어야 검증 실패 뒤 폼이 초기화돼도 입력이 남는다.
  const [question, setQuestion] = useState("");
  const [closesAt, setClosesAt] = useState("");
  // 칸마다 고정 key를 줘서, 중간 칸을 지워도 다른 칸의 입력값이 섞이지 않게 한다.
  const [options, setOptions] = useState<OptionField[]>([
    { key: 0, value: "" },
    { key: 1, value: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);

  function addOption() {
    setOptions((fields) => [...fields, { key: nextKey, value: "" }]);
    setNextKey((key) => key + 1);
  }

  function setOption(key: number, value: string) {
    setOptions((fields) => fields.map((field) => (field.key === key ? { ...field, value } : field)));
  }

  function removeOption(key: number) {
    setOptions((fields) => fields.filter((field) => field.key !== key));
  }

  return (
    <form action={action} className="card stack">
      <label className="field">
        <span>질문</span>
        <input
          name="question"
          required
          maxLength={LIMITS.questionMaxLength}
          placeholder="예: MT 장소는 어디가 좋을까요?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </label>

      <fieldset className="stack gap-2">
        <legend className="mb-1.5 text-sm font-medium">
          선택지 ({LIMITS.minOptions}~{LIMITS.maxOptions}개)
        </legend>
        {options.map((field, index) => (
          <div key={field.key} className="field flex-row items-center gap-2">
            <input
              name="option"
              required
              maxLength={LIMITS.optionMaxLength}
              aria-label={`선택지 ${index + 1}`}
              placeholder={`선택지 ${index + 1}`}
              className="flex-1"
              value={field.value}
              onChange={(e) => setOption(field.key, e.target.value)}
            />
            {options.length > LIMITS.minOptions && (
              <button
                type="button"
                className="button"
                aria-label={`선택지 ${index + 1} 빼기`}
                onClick={() => removeOption(field.key)}
              >
                빼기
              </button>
            )}
          </div>
        ))}
        {options.length < LIMITS.maxOptions && (
          <button type="button" className="button self-start" onClick={addOption}>
            + 선택지 추가
          </button>
        )}
      </fieldset>

      <label className="field">
        <span>마감 시각 (한국 시간)</span>
        <input
          type="datetime-local"
          name="closesAt"
          required
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
        />
      </label>

      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "만드는 중…" : "투표 만들기"}
      </button>
    </form>
  );
}
