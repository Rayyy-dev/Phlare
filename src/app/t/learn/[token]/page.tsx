import { headers } from "next/headers";
import { ShieldAlert, TriangleAlert, Info } from "lucide-react";
import { getTargetForRender, recordEventOnce } from "@/server/tracking/events";
import { getQuizForToken } from "@/server/quizzes/service";
import { QuizRunner } from "./QuizRunner";

export const dynamic = "force-dynamic";

/**
 * Teachable-moment page — the just-in-time micro-learning landing point after a
 * click or submission. Every simulated interaction ends here (never a dead end).
 * Discloses the exercise, explains the specific red flags from the template that
 * fooled the recipient and the landing page they reached, records LEARN_VIEWED,
 * and presents the campaign's knowledge-check quiz when one is attached.
 */
export default async function LearnPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ua = (await headers()).get("user-agent");
  await recordEventOnce(token, "LEARN_VIEWED", ua).catch(() => {});

  const [target, quiz] = await Promise.all([
    getTargetForRender(token),
    getQuizForToken(token).catch(() => null),
  ]);
  const redFlags = (target?.campaign.emailTemplate.redFlags as string[] | undefined) ?? [];
  const landingName = target?.campaign.landingPage.name;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="card space-y-6">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>This was an authorised internal security-awareness exercise.</strong>{" "}
            No account was compromised and nothing you typed was stored.
          </span>
        </div>

        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">
              That was a simulated phishing email
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              Real attackers use messages exactly like this one. Here are the warning
              signs it contained — spotting them is how you stay safe.
            </p>
          </div>
        </div>

        {redFlags.length > 0 ? (
          <ul className="space-y-2">
            {redFlags.map((flag, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-600">
            Always check the sender address, be wary of urgency, and hover over
            links before clicking.
          </p>
        )}

        {landingName && (
          <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600 ring-1 ring-inset ring-ink-100">
            The link led to a fake <strong className="font-medium text-ink-800">{landingName}</strong> page
            designed to collect credentials. A genuine sign-in page is reached by typing
            the address yourself — not by following an email link.
          </p>
        )}

        <p className="text-xs text-ink-500">
          If you receive a message like this for real, report it to your IT or
          security team.
        </p>
      </div>

      {quiz && (
        <div className="card mt-6">
          <QuizRunner
            token={token}
            title={quiz.title}
            questions={quiz.questions}
            alreadyAnswered={quiz.alreadyAnswered}
          />
        </div>
      )}
    </main>
  );
}
