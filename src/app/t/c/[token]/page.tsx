import { headers } from "next/headers";
import { recordClick, getTargetForRender } from "@/server/tracking/events";
import type { LandingFieldDef } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Neutral page shown for unknown/expired tokens — no detail that could confirm
// whether a token is valid.
function Unavailable() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-800">This link is no longer available</h1>
      <p className="mt-2 text-sm text-slate-500">If you reached this page from an email, you can safely close it.</p>
    </main>
  );
}

export default async function ClickPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ua = (await headers()).get("user-agent");
  await recordClick(token, ua).catch(() => {});

  const target = await getTargetForRender(token);
  if (!target || target.campaign.deletedAt) return <Unavailable />;

  const landing = target.campaign.landingPage;
  const fields = landing.hasForm ? (landing.fieldDefs as LandingFieldDef[]) : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="card">
        {/* Landing HTML was sanitised on save; safe to render. */}
        <div dangerouslySetInnerHTML={{ __html: landing.htmlBody }} />

        {landing.hasForm && fields.length > 0 && (
          <form method="post" action={`/t/s/${token}`} className="mt-5 space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="label" htmlFor={f.name}>{f.label}</label>
                <input id={f.name} name={f.name} type={f.type} className="input" />
              </div>
            ))}
            <button type="submit" className="btn-primary w-full">Sign in</button>
          </form>
        )}
      </div>
    </main>
  );
}
