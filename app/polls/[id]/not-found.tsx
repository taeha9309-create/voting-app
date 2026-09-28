import Link from "next/link";

export default function PollNotFound() {
  return (
    <main className="page">
      <h1 className="page-title">투표를 찾을 수 없습니다</h1>
      <p className="muted">삭제되었거나 잘못된 링크입니다.</p>
      <Link href="/" className="link">
        투표 목록으로 돌아가기
      </Link>
    </main>
  );
}
