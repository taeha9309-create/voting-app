import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "운영자 로그인" };

export default function LoginPage() {
  return (
    <main className="page">
      <h1 className="page-title">운영자 로그인</h1>
      <p className="muted">운영진이 같이 쓰는 비밀번호를 입력하세요.</p>
      <LoginForm />
    </main>
  );
}
