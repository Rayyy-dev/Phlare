import { requireAdmin } from "@/server/auth/guard";
import { getSettings } from "@/server/settings/settings";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

/**
 * Authenticated admin shell. The `requireAdmin` guard runs server-side on every
 * request into this route group, so all admin pages are protected by default.
 * The collapsible navigation lives in the client `Sidebar` component.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar orgName={settings.orgName} adminName={admin.name} adminEmail={admin.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pb-10 pt-20 sm:px-6 md:pt-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
