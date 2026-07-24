import { NextRequest, NextResponse } from "next/server";

import {
  MediaStudioValidationError,
  upstreamAssetHeaders,
  upstreamAssetUrl,
} from "@/src/lib/media-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARDED_HEADERS = [
  "accept-ranges",
  "content-disposition",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  try {
    const { path } = await context.params;
    const upstream = await fetch(upstreamAssetUrl(path), {
      method: "GET",
      headers: upstreamAssetHeaders(request),
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });

    if (!upstream.ok && upstream.status !== 206) {
      const status = upstream.status === 404 || upstream.status === 416 ? upstream.status : 502;
      return NextResponse.json(
        {
          ok: false,
          error: status === 404 ? "Rendered asset not found." : "Rendered asset is unavailable.",
        },
        { status },
      );
    }

    const contentType = upstream.headers.get("content-type");
    if (
      contentType &&
      !contentType.startsWith("video/") &&
      !contentType.startsWith("application/octet-stream")
    ) {
      return NextResponse.json(
        { ok: false, error: "The renderer returned an unexpected asset type." },
        { status: 502 },
      );
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
    for (const header of FORWARDED_HEADERS) {
      const value = upstream.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    }
    if (!headers.has("content-disposition")) {
      headers.set("Content-Disposition", "inline");
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    if (error instanceof MediaStudioValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: "Rendered asset is unavailable." },
      { status: 502 },
    );
  }
}
