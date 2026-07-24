import { NextRequest, NextResponse } from "next/server";

import {
  attachMediaStudioSession,
  createMediaRenderJob,
  isMediaStudioAccessConfigured,
  isMediaStudioAuthorized,
  MediaRendererError,
  MediaStudioValidationError,
  parseCreateMediaJobInput,
  pingMediaRenderer,
} from "@/src/lib/media-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorizedResponse(): NextResponse {
  const configured = isMediaStudioAccessConfigured();
  return NextResponse.json(
    {
      ok: false,
      error: configured
        ? "Evidence Studio access token required."
        : "DPAL_MEDIA_STUDIO_ACCESS_TOKEN must be configured on the production server.",
      requiresAccessToken: configured,
      configurationError: !configured,
    },
    { status: 401 },
  );
}

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isMediaStudioAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    await pingMediaRenderer();
    return attachMediaStudioSession(
      NextResponse.json({
        ok: true,
        product: "DPAL Evidence Studio",
        service: "DPAL Private Media Renderer",
        protected: Boolean(process.env.DPAL_MEDIA_STUDIO_ACCESS_TOKEN?.trim()),
        reportsEnabled: true,
        reportSigningConfigured: Boolean(process.env.DPAL_MEDIA_REPORT_SIGNING_KEY?.trim()),
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isMediaStudioAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const input = parseCreateMediaJobInput(body);
    const job = await createMediaRenderJob(input);

    return attachMediaStudioSession(
      NextResponse.json(
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
      ),
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
