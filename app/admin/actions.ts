"use server";

import { redirect } from "next/navigation";
import { endAdminSession, startAdminSession } from "@/lib/server/admin-session";
import { getVoting } from "@/lib/server/voting";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!getVoting().checkAdminPassword(password)) {
    return { error: "비밀번호가 틀렸습니다." };
  }
  await startAdminSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/");
}
