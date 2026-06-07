import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { listQuizzes } from "@/server/quizzes/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { deleteQuizAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  await requireAdmin();
  const quizzes = await listQuizzes();

  return (
    <div className="space-y-6">
      <PageHeader title="Quizzes" description="Knowledge checks you can attach to a campaign.">
        <Link href="/quizzes/new" className="btn-primary"><Plus className="h-4 w-4" /> New quiz</Link>
      </PageHeader>

      <div className="card overflow-hidden p-0">
        {quizzes.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No quizzes yet"
            description="Create a short quiz to reinforce learning after a simulation."
          >
            <Link href="/quizzes/new" className="btn-primary"><Plus className="h-4 w-4" /> New quiz</Link>
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Questions</th>
                <th>Related template</th>
                <th className="text-right">Completions</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.id}>
                  <td className="cell-strong">{q.title}</td>
                  <td>{(q.questions as unknown[]).length}</td>
                  <td>{q.template?.name ?? "—"}</td>
                  <td className="text-right">{q._count.results}</td>
                  <td>
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/quizzes/${q.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">Edit</Link>
                      <form action={deleteQuizAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <ConfirmSubmit message={`Delete quiz "${q.title}"? Its results will also be removed.`}>Delete</ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
