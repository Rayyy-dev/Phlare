import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Consistent "back to list" link used at the top of detail and form pages. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-800"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
