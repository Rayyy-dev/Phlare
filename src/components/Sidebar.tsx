"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UsersRound, Mail, AppWindow, ListChecks,
  Send, Megaphone, BarChart3, Settings, Flame, LogOut,
  PanelLeftClose, PanelLeftOpen, Menu, X, type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/(admin)/actions";

interface Item { href: string; label: string; Icon: LucideIcon }
const GROUPS: { label?: string; items: Item[] }[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard }] },
  { label: "Audience", items: [
    { href: "/recipients", label: "Recipients", Icon: Users },
    { href: "/groups", label: "Groups", Icon: UsersRound },
  ] },
  { label: "Content", items: [
    { href: "/templates", label: "Email Templates", Icon: Mail },
    { href: "/landing-pages", label: "Landing Pages", Icon: AppWindow },
    { href: "/quizzes", label: "Quizzes", Icon: ListChecks },
  ] },
  { label: "Delivery", items: [
    { href: "/sending-profiles", label: "Sending Profiles", Icon: Send },
    { href: "/campaigns", label: "Campaigns", Icon: Megaphone },
    { href: "/analytics", label: "Analytics", Icon: BarChart3 },
  ] },
  { label: "System", items: [{ href: "/settings", label: "Settings", Icon: Settings }] },
];

export function Sidebar({ orgName, adminName, adminEmail }: { orgName: string; adminName: string; adminEmail: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Tooltip shown beside icons while collapsed. Positioned `fixed` so the
  // scrolling nav container can never clip it.
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);

  // Restore the persisted desktop collapsed state on mount.
  useEffect(() => {
    setCollapsed(localStorage.getItem("phlare:sidebar") === "collapsed");
  }, []);
  const toggleCollapsed = () => setCollapsed((c) => {
    const next = !c;
    localStorage.setItem("phlare:sidebar", next ? "collapsed" : "expanded");
    return next;
  });

  // Close the mobile drawer (and any tooltip) on navigation.
  useEffect(() => { setMobileOpen(false); setTip(null); }, [pathname]);

  const showTip = (label: string) => (e: React.MouseEvent<HTMLElement>) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2 });
  };

  // `collapsed` only applies on desktop (md+); the mobile drawer is always full.
  const hideCollapsed = collapsed ? "md:hidden" : "";
  const centerCollapsed = collapsed ? "md:justify-center md:gap-0" : "";

  const initials = adminName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "A";

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200 bg-white/90 px-4 backdrop-blur md:hidden">
        <span className="flex items-center gap-2 font-semibold text-ink-900">
          <Flame className="h-5 w-5 text-brand-600" /> Phlare
        </span>
        <button onClick={() => setMobileOpen(true)} className="btn-ghost -mr-2" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={[
          "z-50 flex flex-col border-r border-ink-200 bg-white",
          "fixed inset-y-0 left-0 w-[252px] transition-[width,transform] duration-200 ease-out",
          "md:sticky md:top-0 md:h-screen md:self-start md:translate-x-0 md:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[68px]" : "md:w-64",
        ].join(" ")}
      >
        {/* Header: brand + collapse toggle (top) */}
        <div className={["flex h-16 shrink-0 items-center gap-2.5 border-b border-ink-200 px-3", centerCollapsed].join(" ")}>
          {/* Brand — hidden on desktop while collapsed (the toggle takes its place) */}
          <span className={["flex min-w-0 flex-1 items-center gap-2.5", hideCollapsed].join(" ")}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Flame className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] font-semibold leading-tight text-ink-900">Phlare</span>
              <span className="block truncate text-xs text-ink-500">{orgName}</span>
            </span>
          </span>

          {/* Desktop collapse / expand toggle */}
          <button
            onClick={toggleCollapsed}
            className="hidden shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          {/* Mobile close */}
          <button onClick={() => setMobileOpen(false)} className="btn-ghost -mr-1 ml-auto md:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav — the only region that scrolls */}
        <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Primary">
          {GROUPS.map((group, gi) => (
            <div key={gi} className="space-y-0.5">
              {group.label && (
                <p className={["px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-400", hideCollapsed].join(" ")}>{group.label}</p>
              )}
              {group.items.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    onMouseEnter={showTip(label)}
                    onMouseLeave={() => setTip(null)}
                    className={[
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      centerCollapsed,
                      active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                    ].join(" ")}
                  >
                    <Icon className={["h-[1.15rem] w-[1.15rem] shrink-0", active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"].join(" ")} strokeWidth={2} />
                    <span className={["truncate", hideCollapsed].join(" ")}>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: user + sign out */}
        <div className="shrink-0 border-t border-ink-200 p-3">
          <div className={["flex items-center gap-2.5", centerCollapsed].join(" ")}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">{initials}</span>
            <div className={["min-w-0 flex-1", hideCollapsed].join(" ")}>
              <p className="truncate text-sm font-medium text-ink-800">{adminName}</p>
              <p className="truncate text-xs text-ink-500">{adminEmail}</p>
            </div>
            <form action={logoutAction} className={hideCollapsed}>
              <button type="submit" className="btn-ghost -mr-1 px-2" title="Sign out" aria-label="Sign out">
                <LogOut className="h-[1.1rem] w-[1.1rem]" />
              </button>
            </form>
          </div>
          {/* Desktop-collapsed sign out (full-width icon) */}
          <form action={logoutAction} className={collapsed ? "mt-2 hidden md:block" : "hidden"}>
            <button type="submit" className="btn-ghost w-full justify-center px-2" title="Sign out" aria-label="Sign out">
              <LogOut className="h-[1.1rem] w-[1.1rem]" />
            </button>
          </form>
        </div>
      </aside>

      {/* Collapsed hover tooltip (desktop only) */}
      {collapsed && tip && (
        <div
          className="pointer-events-none fixed z-[60] hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-pop md:block"
          style={{ left: 76, top: tip.top }}
          role="tooltip"
        >
          {tip.label}
        </div>
      )}
    </>
  );
}
