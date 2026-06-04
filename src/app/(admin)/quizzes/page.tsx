import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listQuizzes } from "@/server/quizzes/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteQuizAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  await requireAdmin();
  const quizzes = await listQuizzes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="mt-1 text-sm text-slate-600">Knowledge checks you can attach to a campaign.</p>
        </div>
        <Link href="/quizzes/new" className="btn-primary">New quiz</Link>
      </div>

      <div className="card p-0">
        {quizzes.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No quizzes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Related template</th>
                <th className="px-4 py-3 text-right">Completions</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizzes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{q.title}</td>
                  <td className="px-4 py-3 text-slate-600">{(q.questions as unknown[]).length}</td>
                  <td className="px-4 py-3 text-slate-600">{q.template?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{q._count.results}</td>
                  <td className="px-4 py-3">
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
