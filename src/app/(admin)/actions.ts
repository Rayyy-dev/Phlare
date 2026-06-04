"use server";

import { redirect } from "next/navigation";
import {
  getCurrentSession,
  invalidateSession,
  clearSessionCookie,
} from "@/server/auth/session";

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await invalidateSession(session.sessionId);
  }
  await clearSessionCookie();
  redirect("/login");
}
