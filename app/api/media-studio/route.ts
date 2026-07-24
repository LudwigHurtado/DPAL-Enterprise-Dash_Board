import { NextRequest, NextResponse } from "next/server";

import {
  attachMediaStudioSession,
  createMoneyPrinterJob,
  isMediaStudioAccessConfigured,
  isMediaStudioAuthorized,
  MediaStudioValidationError,
  MoneyPrinterError,
  parseCreateMediaJobInput,
  pingMoneyPrinter,
} from "@/src/lib/moneyprinter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorizedResponse(): NextResponse {
  const configured = isMediaStudioAccessConfigured();
  return NextResponse.json(
    {
      ok: false,
      error: configured
        ? "Media Studio access token required."
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
  if (error instanceof MoneyPrinterError) {
    const status = error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 502;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }
  return NextResponse.json(
    { ok: false, error: "The Media Studio request could not be completed." },
    { status: 500 },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isMediaStudioAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    await pingMoneyPrinter();
    return attachMediaStudioSession(
      NextResponse.json({
        ok: true,
        service: "MoneyPrinterTurbo",
        protected: Boolean(process.env.DPAL_MEDIA_STUDIO_ACCESS_TOKEN?.trim()),
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
    const job = await createMoneyPrinterJob(input);

    return attachMediaStudioSession(
      NextResponse.json(
        {
          ok: true,
          job,
          manifest: {
            projectReference: input.projectReference || null,
            evidenceReferences: input.evidenceReferences || null,
            scriptReviewed: true,
          },
          notice: "Draft render only. Human approval is required before publishing.",
        },
        { status: 202 },
      ),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "The request body must be valid JSON." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
