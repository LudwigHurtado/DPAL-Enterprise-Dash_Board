import { NextResponse } from "next/server";

import {
  getMediaRenderJob,
  MediaRendererError,
  MediaStudioValidationError,
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
    { ok: false, error: "The render status could not be loaded." },
    { status: 500 },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  try {
    const { taskId } = await context.params;
    const job = await getMediaRenderJob(taskId);
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return errorResponse(error);
  }
}
