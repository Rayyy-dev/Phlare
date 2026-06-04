import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { getSettings } from "@/server/settings/settings";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Authenticated admin shell. The `requireAdmin` guard runs server-side on every
 * request into this route group, so all admin pages are protected by default.
 *
 * Phase 1 ships the navigation scaffold; later phases fill in each section.
 */

const NAV: { href: string; label: string; phase?: number }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/recipients", label: "Recipients" },
  { href: "/groups", label: "Groups" },
  { href: "/templates", label: "Email Templates" },
  { href: "/landing-pages", label: "Landing Pages" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/sending-profiles", label: "Sending Profiles" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/analytics", label: "Analytics", phase: 6 },
  { href: "/settings", label: "Settings", phase: 6 },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-lg font-bold text-brand-600">Phlare</p>
          <p className="truncate text-xs text-slate-500">{settings.orgName}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>{item.label}</span>
              {item.phase && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                  P{item.phase}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-3 text-xs text-slate-500">{admin.email}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-2 w-full btn-secondary">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 md:hidden">
          <span className="font-bold text-brand-600">Phlare</span>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-slate-600">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
