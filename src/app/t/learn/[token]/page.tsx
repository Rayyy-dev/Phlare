import { headers } from "next/headers";
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
      <div className="card space-y-5">
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>This was an authorised internal security-awareness exercise.</strong>{" "}
          No account was compromised and nothing you typed was stored.
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            That was a simulated phishing email
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Real attackers use messages exactly like this one. Here are the warning
            signs it contained — spotting them is how you stay safe.
          </p>
        </div>

        {redFlags.length > 0 ? (
          <ul className="space-y-2">
            {redFlags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="text-amber-500">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            Always check the sender address, be wary of urgency, and hover over
            links before clicking.
          </p>
        )}

        {landingName && (
          <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
            The link led to a fake <strong>{landingName}</strong> page designed to
            collect credentials. A genuine sign-in page is reached by typing the
            address yourself — not by following an email link.
          </p>
        )}

        <p className="text-xs text-slate-400">
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
