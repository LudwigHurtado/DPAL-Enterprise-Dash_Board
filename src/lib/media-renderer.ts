import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const DEFAULT_DEVELOPMENT_RENDERER_URL = "http://127.0.0.1:8080";
const DEFAULT_TIMEOUT_MS = 15_000;
const MEDIA_ACCESS_COOKIE = "dpal_media_session";
const TASK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ASPECTS = new Set(["9:16", "16:9", "1:1"] as const);
const ALLOWED_SOURCES = new Set(["pexels", "pixabay"] as const);
const ASSET_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

export type VideoAspect = "9:16" | "16:9" | "1:1";
export type VideoSource = "pexels" | "pixabay";
export type MediaJobStatus = "queued" | "processing" | "completed" | "failed";

export interface CreateMediaJobInput {
  title: string;
  script: string;
  visualKeywords: string;
  aspect: VideoAspect;
  language: string;
  voiceName: string;
  source: VideoSource;
  subtitleEnabled: boolean;
  backgroundMusic: boolean;
  projectReference: string;
  evidenceReferences: string;
  reviewConfirmed: true;
}

export interface MediaJob {
  id: string;
  status: MediaJobStatus;
  progress: number;
  state: number | null;
  outputs: string[];
  failedStage: string | null;
  error: string | null;
}

export interface MediaProductionReport {
  schemaVersion: "1.0";
  reportId: string;
  generatedAt: string;
  product: "DPAL Evidence Studio";
  reportType: "media-production-record";
  publicationStatus: "draft-review-required";
  project: {
    reference: string | null;
    title: string;
  };
  evidence: {
    references: string | null;
    scriptSha256: string;
    evidenceReferencesSha256: string | null;
  };
  render: {
    taskId: string;
    status: "completed";
    progress: number;
    outputs: string[];
    configuration: {
      aspect: VideoAspect;
      source: VideoSource;
      language: string;
      voiceName: string;
      subtitlesEnabled: boolean;
      backgroundMusicEnabled: boolean;
      visualKeywords: string | null;
    };
  };
  governance: {
    scriptReviewed: true;
    publicationApproved: false;
    requiredReview: string[];
    notice: string;
  };
  integrity: {
    recordSha256: string;
    signatureAlgorithm: "HMAC-SHA256" | null;
    signature: string | null;
    signed: boolean;
  };
}

interface RendererEnvelope<T> {
  status: number;
  message?: string;
  data: T;
}

interface RendererTaskData {
  task_id: string;
  state?: number;
  progress?: number;
  videos?: unknown;
  combined_videos?: unknown;
  failed_stage?: unknown;
  error?: unknown;
}

export class MediaStudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStudioValidationError";
  }
}

export class MediaRendererError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "MediaRendererError";
    this.statusCode = statusCode;
  }
}

function readString(
  value: unknown,
  field: string,
  options: { min?: number; max: number; required?: boolean },
): string {
  if (typeof value !== "string") {
    if (options.required) {
      throw new MediaStudioValidationError(`${field} is required.`);
    }
    return "";
  }

  const normalized = value.trim();
  if (options.required && normalized.length < (options.min ?? 1)) {
    throw new MediaStudioValidationError(
      `${field} must contain at least ${options.min ?? 1} characters.`,
    );
  }
  if (normalized.length > options.max) {
    throw new MediaStudioValidationError(
      `${field} must not exceed ${options.max} characters.`,
    );
  }
  return normalized;
}

function configuredValue(primaryName: string, legacyName?: string): string {
  const primary = process.env[primaryName]?.trim();
  if (primary) return primary;
  return legacyName ? process.env[legacyName]?.trim() ?? "" : "";
}

export function parseCreateMediaJobInput(value: unknown): CreateMediaJobInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MediaStudioValidationError("A JSON request body is required.");
  }

  const input = value as Record<string, unknown>;
  const aspect = typeof input.aspect === "string" ? input.aspect : "9:16";
  const source = typeof input.source === "string" ? input.source : "pexels";

  if (!ALLOWED_ASPECTS.has(aspect as VideoAspect)) {
    throw new MediaStudioValidationError("aspect must be 9:16, 16:9, or 1:1.");
  }
  if (!ALLOWED_SOURCES.has(source as VideoSource)) {
    throw new MediaStudioValidationError("source must be pexels or pixabay.");
  }
  if (input.reviewConfirmed !== true) {
    throw new MediaStudioValidationError(
      "Confirm that the script and evidence references were reviewed before rendering.",
    );
  }

  return {
    title: readString(input.title, "title", { required: true, min: 3, max: 200 }),
    script: readString(input.script, "script", { required: true, min: 40, max: 8_000 }),
    visualKeywords: readString(input.visualKeywords, "visualKeywords", { max: 500 }),
    aspect: aspect as VideoAspect,
    language: readString(input.language, "language", { max: 64 }) || "en",
    voiceName:
      readString(input.voiceName, "voiceName", { max: 160 }) ||
      "en-US-JennyNeural-Female",
    source: source as VideoSource,
    subtitleEnabled: input.subtitleEnabled !== false,
    backgroundMusic: input.backgroundMusic === true,
    projectReference: readString(input.projectReference, "projectReference", { max: 120 }),
    evidenceReferences: readString(input.evidenceReferences, "evidenceReferences", {
      max: 1_000,
    }),
    reviewConfirmed: true,
  };
}

export function parseProductionReportRequest(
  value: unknown,
): { taskId: string; input: CreateMediaJobInput } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MediaStudioValidationError("A JSON request body is required.");
  }
  const request = value as Record<string, unknown>;
  const taskId = readString(request.taskId, "taskId", { required: true, max: 64 });
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new MediaStudioValidationError("Invalid task identifier.");
  }
  return { taskId, input: parseCreateMediaJobInput(value) };
}

function mediaRendererBaseUrl(): string {
  const configured = configuredValue("DPAL_MEDIA_RENDERER_URL", "MONEYPRINTER_API_URL");
  if (!configured && process.env.NODE_ENV === "production") {
    throw new MediaRendererError(
      "DPAL_MEDIA_RENDERER_URL must be configured on the production server.",
      503,
    );
  }
  const raw = configured || DEFAULT_DEVELOPMENT_RENDERER_URL;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new MediaRendererError("The private media renderer URL is invalid.", 503);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new MediaRendererError("The private media renderer URL is invalid.", 503);
  }

  return parsed.toString().replace(/\/$/, "");
}

function requestTimeoutMs(): number {
  const configured = Number(
    configuredValue("DPAL_MEDIA_RENDERER_TIMEOUT_MS", "MONEYPRINTER_REQUEST_TIMEOUT_MS"),
  );
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 120_000
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

function upstreamHeaders(requestId: string, includeJson = false): Headers {
  const headers = new Headers({
    Accept: "application/json",
    "x-task-id": requestId,
  });
  if (includeJson) {
    headers.set("Content-Type", "application/json");
  }
  const apiKey = configuredValue("DPAL_MEDIA_RENDERER_API_KEY", "MONEYPRINTER_API_KEY");
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  }
  return headers;
}

function publicUpstreamMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      const sanitized = message
        .trim()
        .replace(/https?:\/\/\S+/gi, "[upstream-url]")
        .replace(/[\r\n\t]+/g, " ");
      return sanitized.slice(0, 300);
    }
  }
  return fallback;
}

async function requestJson<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());
  const requestId = `dpal-${randomUUID()}`;

  try {
    const response = await fetch(`${mediaRendererBaseUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: upstreamHeaders(requestId, init.body !== undefined),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    const envelopeStatus =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { status?: unknown }).status === "number"
        ? (payload as { status: number }).status
        : response.status;

    if (!response.ok || envelopeStatus >= 400) {
      if (response.status === 401 || response.status === 403) {
        throw new MediaRendererError(
          "The private media renderer rejected its server-side API credentials.",
          502,
        );
      }
      throw new MediaRendererError(
        publicUpstreamMessage(payload, "The private media renderer rejected the request."),
        response.status >= 400 ? response.status : 502,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof MediaRendererError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new MediaRendererError("The private media renderer did not respond in time.", 504);
    }
    throw new MediaRendererError("The private media renderer is unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
}

function requireEnvelopeData<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw new MediaRendererError("The private media renderer returned an invalid response.");
  }
  const envelope = payload as Partial<RendererEnvelope<T>>;
  if (!envelope.data || typeof envelope.data !== "object") {
    throw new MediaRendererError("The private media renderer returned an invalid response.");
  }
  return envelope.data as T;
}

function isSafeAssetPath(pathSegments: string[]): boolean {
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  return (
    pathSegments.length >= 3 &&
    pathSegments.length <= 8 &&
    pathSegments[0] === "tasks" &&
    TASK_ID_PATTERN.test(pathSegments[1]) &&
    lastSegment.toLowerCase().endsWith(".mp4") &&
    pathSegments.every((segment) => ASSET_SEGMENT_PATTERN.test(segment))
  );
}

function toProxyAssetUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value, `${mediaRendererBaseUrl()}/`);
    const decodedSegments = parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));

    if (!isSafeAssetPath(decodedSegments)) {
      return null;
    }

    return `/api/media-studio/assets/${decodedSegments
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
  } catch {
    return null;
  }
}

function collectOutputs(data: RendererTaskData): string[] {
  const candidates = [data.combined_videos, data.videos]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map(toProxyAssetUrl)
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(candidates));
}

function normalizeJob(data: RendererTaskData): MediaJob {
  const progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
  const state = typeof data.state === "number" ? data.state : null;
  const outputs = collectOutputs(data);
  const error =
    typeof data.error === "string" && data.error.trim()
      ? data.error.trim().slice(0, 500)
      : null;
  const failedStage =
    typeof data.failed_stage === "string" && data.failed_stage.trim()
      ? data.failed_stage.trim().slice(0, 100)
      : null;

  let status: MediaJobStatus = "queued";
  if ((state !== null && state < 0) || error) {
    status = "failed";
  } else if (outputs.length > 0) {
    status = "completed";
  } else if (progress > 0 || (state !== null && state !== 0)) {
    status = "processing";
  }

  return {
    id: data.task_id,
    status,
    progress,
    state,
    outputs,
    failedStage,
    error,
  };
}

export async function pingMediaRenderer(): Promise<void> {
  const response = await requestJson<unknown>("/ping");
  if (response !== "pong") {
    throw new MediaRendererError(
      "The private media renderer health check returned an unexpected response.",
      502,
    );
  }
}

export async function createMediaRenderJob(input: CreateMediaJobInput): Promise<MediaJob> {
  const payload = {
    video_subject: input.title,
    video_script: input.script,
    video_terms: input.visualKeywords || null,
    video_aspect: input.aspect,
    video_concat_mode: "sequential",
    video_clip_duration: 5,
    video_clip_speed: 1,
    match_materials_to_script: false,
    video_count: 1,
    video_source: input.source,
    video_language: input.language,
    voice_name: input.voiceName,
    voice_volume: 1,
    voice_rate: 1,
    bgm_type: input.backgroundMusic ? "random" : "",
    bgm_file: "",
    bgm_volume: input.backgroundMusic ? 0.15 : 0,
    subtitle_enabled: input.subtitleEnabled,
    subtitle_position: "bottom",
    text_fore_color: "#FFFFFF",
    text_background_color: false,
    rounded_subtitle_background: true,
    font_size: input.aspect === "9:16" ? 60 : 48,
    stroke_color: "#000000",
    stroke_width: 1.5,
    n_threads: 2,
    paragraph_number: 1,
  };

  const envelope = await requestJson<RendererEnvelope<{ task_id: string }>>(
    "/api/v1/videos",
    { method: "POST", body: payload },
  );
  const data = requireEnvelopeData<{ task_id: string }>(envelope);
  if (typeof data.task_id !== "string" || !TASK_ID_PATTERN.test(data.task_id)) {
    throw new MediaRendererError("The private media renderer returned an invalid task identifier.");
  }

  return {
    id: data.task_id,
    status: "queued",
    progress: 0,
    state: null,
    outputs: [],
    failedStage: null,
    error: null,
  };
}

export async function getMediaRenderJob(taskId: string): Promise<MediaJob> {
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new MediaStudioValidationError("Invalid task identifier.");
  }

  const envelope = await requestJson<RendererEnvelope<RendererTaskData>>(
    `/api/v1/tasks/${encodeURIComponent(taskId)}`,
  );
  const data = requireEnvelopeData<RendererTaskData>(envelope);
  if (typeof data.task_id !== "string" || !TASK_ID_PATTERN.test(data.task_id)) {
    throw new MediaRendererError("The private media renderer returned an invalid task response.");
  }
  return normalizeJob(data);
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function createMediaProductionReport(
  taskId: string,
  input: CreateMediaJobInput,
): Promise<MediaProductionReport> {
  const job = await getMediaRenderJob(taskId);
  if (job.status !== "completed" || job.outputs.length === 0) {
    throw new MediaStudioValidationError(
      "A production report can be issued only after the render is complete.",
    );
  }

  const generatedAt = new Date().toISOString();
  const scriptSha256 = sha256(input.script);
  const evidenceReferencesSha256 = input.evidenceReferences
    ? sha256(input.evidenceReferences)
    : null;

  const record = {
    schemaVersion: "1.0" as const,
    reportId: `DPAL-MEDIA-${generatedAt.slice(0, 10).replace(/-/g, "")}-${job.id
      .slice(0, 8)
      .toUpperCase()}`,
    generatedAt,
    product: "DPAL Evidence Studio" as const,
    reportType: "media-production-record" as const,
    publicationStatus: "draft-review-required" as const,
    project: {
      reference: input.projectReference || null,
      title: input.title,
    },
    evidence: {
      references: input.evidenceReferences || null,
      scriptSha256,
      evidenceReferencesSha256,
    },
    render: {
      taskId: job.id,
      status: "completed" as const,
      progress: job.progress,
      outputs: job.outputs,
      configuration: {
        aspect: input.aspect,
        source: input.source,
        language: input.language,
        voiceName: input.voiceName,
        subtitlesEnabled: input.subtitleEnabled,
        backgroundMusicEnabled: input.backgroundMusic,
        visualKeywords: input.visualKeywords || null,
      },
    },
    governance: {
      scriptReviewed: true as const,
      publicationApproved: false as const,
      requiredReview: [
        "Factual claims and source evidence",
        "Geographic accuracy",
        "Image and music licensing",
        "Consent, privacy, and safeguarding",
        "Narration, subtitles, and final editorial approval",
      ],
      notice:
        "This record confirms render completion and input integrity. It does not constitute final publication approval or independent verification of stock imagery.",
    },
  };

  const recordSha256 = sha256(JSON.stringify(record));
  const signingKey = process.env.DPAL_MEDIA_REPORT_SIGNING_KEY?.trim() ?? "";
  const signature = signingKey
    ? createHmac("sha256", signingKey).update(recordSha256, "utf8").digest("hex")
    : null;

  return {
    ...record,
    integrity: {
      recordSha256,
      signatureAlgorithm: signature ? "HMAC-SHA256" : null,
      signature,
      signed: Boolean(signature),
    },
  };
}

function hashAccessToken(token: string): string {
  return sha256(token);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isMediaStudioAccessConfigured(): boolean {
  return Boolean(process.env.DPAL_MEDIA_STUDIO_ACCESS_TOKEN?.trim());
}

export function isMediaStudioAuthorized(request: NextRequest): boolean {
  const expected = process.env.DPAL_MEDIA_STUDIO_ACCESS_TOKEN?.trim();
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (bearer && safeEqual(bearer, expected)) {
    return true;
  }

  const cookie = request.cookies.get(MEDIA_ACCESS_COOKIE)?.value ?? "";
  return Boolean(cookie) && safeEqual(cookie, hashAccessToken(expected));
}

export function attachMediaStudioSession<T extends NextResponse>(response: T): T {
  const expected = process.env.DPAL_MEDIA_STUDIO_ACCESS_TOKEN?.trim();
  if (!expected) {
    return response;
  }

  response.cookies.set({
    name: MEDIA_ACCESS_COOKIE,
    value: hashAccessToken(expected),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/media-studio",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function upstreamAssetUrl(pathSegments: string[]): string {
  if (!isSafeAssetPath(pathSegments)) {
    throw new MediaStudioValidationError("Invalid asset path.");
  }

  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${mediaRendererBaseUrl()}/${encodedPath}`;
}

export function upstreamAssetHeaders(request: NextRequest): Headers {
  const headers = new Headers({
    Accept: "video/mp4,video/*;q=0.9,application/octet-stream;q=0.5",
  });
  const range = request.headers.get("range");
  if (range) {
    headers.set("Range", range);
  }
  const apiKey = configuredValue("DPAL_MEDIA_RENDERER_API_KEY", "MONEYPRINTER_API_KEY");
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  }
  headers.set("x-task-id", `dpal-asset-${randomUUID()}`);
  return headers;
}
