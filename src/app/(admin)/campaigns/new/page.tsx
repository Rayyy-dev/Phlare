import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listTemplates } from "@/server/templates/service";
import { listLandingPages } from "@/server/landing-pages/service";
import { listProfiles } from "@/server/sending-profiles/service";
import { listGroups } from "@/server/groups/service";
import { prisma } from "@/server/db";
import { CampaignForm } from "../CampaignForm";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  await requireAdmin();
  const [templates, landingPages, profiles, groups, quizzes] = await Promise.all([
    listTemplates(),
    listLandingPages(),
    listProfiles(),
    listGroups(),
    prisma.quiz.findMany({ select: { id: true, title: true } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/campaigns" className="text-sm text-slate-500 hover:text-slate-700">← Campaigns</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New campaign</h1>
      </div>
      <div className="card">
        <CampaignForm
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          landingPages={landingPages.map((l) => ({ id: l.id, name: l.name }))}
          profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount }))}
          quizzes={quizzes.map((q) => ({ id: q.id, name: q.title }))}
        />
      </div>
    </div>
  );
}
