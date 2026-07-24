import { NextRequest, NextResponse } from "next/server";

import {
  createMediaRenderJob,
  MediaRendererError,
  MediaStudioValidationError,
  parseCreateMediaJobInput,
  pingMediaRenderer,
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
    { ok: false, error: "The Evidence Studio request could not be completed." },
    { status: 500 },
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    await pingMediaRenderer();
    return NextResponse.json({
      ok: true,
      product: "DPAL Evidence Studio",
      service: "DPAL Private Media Renderer",
      protected: false,
      publicAccess: true,
      reportsEnabled: true,
      reportSigningConfigured: Boolean(process.env.DPAL_MEDIA_REPORT_SIGNING_KEY?.trim()),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const input = parseCreateMediaJobInput(body);
    const job = await createMediaRenderJob(input);

    return NextResponse.json(
      {
        ok: true,
        job,
        manifest: {
          product: "DPAL Evidence Studio",
          projectReference: input.projectReference || null,
          evidenceReferences: input.evidenceReferences || null,
          scriptReviewed: true,
          publicationApproved: false,
          productionReportAvailableAfterCompletion: true,
        },
        notice:
          "Draft render queued. A hashed production report becomes available after completion; human approval is still required before publishing.",
      },
      { status: 202 },
    );
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
