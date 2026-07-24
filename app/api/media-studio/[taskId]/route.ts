import { NextRequest, NextResponse } from "next/server";

import {
  attachMediaStudioSession,
  getMoneyPrinterJob,
  isMediaStudioAuthorized,
  MediaStudioValidationError,
  MoneyPrinterError,
} from "@/src/lib/moneyprinter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof MediaStudioValidationError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (error instanceof MoneyPrinterError) {
    const status = error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 502;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }
  return NextResponse.json(
    { ok: false, error: "The render status could not be loaded." },
    { status: 500 },
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  if (!isMediaStudioAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Media Studio access token required.", requiresAccessToken: true },
      { status: 401 },
    );
  }

  try {
    const { taskId } = await context.params;
    const job = await getMoneyPrinterJob(taskId);
    return attachMediaStudioSession(NextResponse.json({ ok: true, job }));
  } catch (error) {
    return errorResponse(error);
  }
}
