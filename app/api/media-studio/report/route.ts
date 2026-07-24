import { NextRequest, NextResponse } from "next/server";

import {
  attachMediaStudioSession,
  createMediaProductionReport,
  isMediaStudioAuthorized,
  MediaRendererError,
  MediaStudioValidationError,
  parseProductionReportRequest,
} from "@/src/lib/media-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof MediaStudioValidationError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (error instanceof MediaRendererError) {
    const status = error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 502;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }
  return NextResponse.json(
    { ok: false, error: "The production report could not be generated." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isMediaStudioAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Evidence Studio access token required.", requiresAccessToken: true },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { taskId, input } = parseProductionReportRequest(body);
    const report = await createMediaProductionReport(taskId, input);
    const filename = `${report.reportId.toLowerCase()}.json`;

    const response = NextResponse.json(
      {
        ok: true,
        report,
        filename,
        notice: report.integrity.signed
          ? "Production record generated and signed."
          : "Production record generated with a SHA-256 integrity hash. Configure DPAL_MEDIA_REPORT_SIGNING_KEY to add an HMAC signature.",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
    return attachMediaStudioSession(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }
    return errorResponse(error);
  }
}
