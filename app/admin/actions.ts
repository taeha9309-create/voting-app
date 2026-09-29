"use server";

import { redirect } from "next/navigation";
import { endAdminSession, hasSessionSecret, startAdminSession } from "@/lib/server/admin-session";
import { getVoting } from "@/lib/server/voting";

export type LoginState = { error?: string };

const WRONG_PASSWORD_DELAY_MS = 1000;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!hasSessionSecret()) {
    return { error: "서버 설정 오류: SESSION_SECRET 환경변수(32자 이상)가 필요합니다." };
  }
  const password = String(formData.get("password") ?? "");
  if (!getVoting().checkAdminPassword(password)) {
    // 비밀번호를 빠르게 여러 번 추측하지 못하게 틀리면 잠시 기다린다.
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return { error: "비밀번호가 틀렸습니다." };
  }
  await startAdminSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/");
}
