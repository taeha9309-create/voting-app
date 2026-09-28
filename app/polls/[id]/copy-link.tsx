"use client";

import { useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function CopyLink({ path }: { path: string }) {
  // 서버 렌더링 때는 주소(origin)를 모르므로 경로만 보여주고, 브라우저에서 전체 주소로 바꾼다.
  const url = useSyncExternalStore(
    subscribe,
    () => `${window.location.origin}${path}`,
    () => path,
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {url}
      </code>
      <button type="button" className="button primary" onClick={copy}>
        {copied ? "복사했습니다" : "링크 복사"}
      </button>
    </div>
  );
}
