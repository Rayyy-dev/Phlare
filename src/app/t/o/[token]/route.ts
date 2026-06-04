import { type NextRequest } from "next/server";
import { recordOpen } from "@/server/tracking/events";
import { allowRequest, clientIp } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

// A 1×1 transparent GIF returned for every request, so the response never
// reveals whether a token was valid (no enumeration hints).
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixelResponse(status = 200) {
  return new Response(PIXEL, {
    status,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate-limit by IP; still return a pixel (never an error page) when throttled.
  if (!allowRequest(`pixel:${clientIp(req.headers)}`)) return pixelResponse(429);

  const { token } = await params;
  // Record the open (idempotent); failures must not break the image response.
  await recordOpen(token, req.headers.get("user-agent")).catch(() => {});

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}
