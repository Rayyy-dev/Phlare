import { type NextRequest, NextResponse } from "next/server";
import { recordSubmit } from "@/server/tracking/events";

export const dynamic = "force-dynamic";

/**
 * Fake-form submission handler.
 *
 * ETHICAL INVARIANT (Section 7.1): we read ONLY the field NAMES that were
 * present and record those. The values the recipient typed (passwords, etc.) are
 * never read, never written to the database, and never logged. `formData()`
 * parses the request body, but we touch only `.keys()` — the values are
 * discarded when this function returns. Always end on the teachable moment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let fieldNames: string[] = [];
  try {
    const form = await req.formData();
    // Names only — do NOT read form.get(name); the typed values are discarded.
    fieldNames = [...form.keys()];
  } catch {
    fieldNames = [];
  }

  await recordSubmit(token, fieldNames, req.headers.get("user-agent")).catch(() => {});

  // Always proceed to the teachable-moment page (never a dead end).
  return NextResponse.redirect(new URL(`/t/learn/${token}`, req.url), 303);
}
