import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/server/admin-session";
import { logout } from "./admin/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "동아리 투표", template: "%s · 동아리 투표" },
  description: "동아리원이 로그인 없이 참여하는 간단한 투표",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await isAdmin();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <nav className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-bold">
              동아리 투표
            </Link>
            {admin && (
              <div className="flex items-center gap-2">
                <Link href="/admin/polls/new" className="button primary">
                  투표 만들기
                </Link>
                <form action={logout}>
                  <button type="submit" className="button">
                    로그아웃
                  </button>
                </form>
              </div>
            )}
          </nav>
        </header>
        {children}
        <footer className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-6 text-sm muted">
          <span />
          {!admin && (
            <Link href="/admin/login" className="muted hover:underline">
              운영자
            </Link>
          )}
        </footer>
      </body>
    </html>
  );
}
