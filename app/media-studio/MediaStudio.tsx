"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type HealthState = "checking" | "online" | "offline" | "locked";
type MediaJobStatus = "queued" | "processing" | "completed" | "failed";

type MediaJob = {
  id: string;
  status: MediaJobStatus;
  progress: number;
  state: number | null;
  outputs: string[];
  failedStage: string | null;
  error: string | null;
};

type MediaProductionReport = {
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
      aspect: "9:16" | "16:9" | "1:1";
      source: "pexels" | "pixabay";
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
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  requiresAccessToken?: boolean;
  protected?: boolean;
  reportsEnabled?: boolean;
  reportSigningConfigured?: boolean;
  service?: string;
  job?: MediaJob;
  report?: MediaProductionReport;
  filename?: string;
  notice?: string;
};

type StudioForm = {
  projectReference: string;
  title: string;
  script: string;
  evidenceReferences: string;
  visualKeywords: string;
  aspect: "9:16" | "16:9" | "1:1";
  language: string;
  voiceName: string;
  source: "pexels" | "pixabay";
  subtitleEnabled: boolean;
  backgroundMusic: boolean;
  reviewConfirmed: boolean;
};

const INITIAL_FORM: StudioForm = {
  projectReference: "",
  title: "",
  script: "",
  evidenceReferences: "",
  visualKeywords: "",
  aspect: "9:16",
  language: "en",
  voiceName: "en-US-JennyNeural-Female",
  source: "pexels",
  subtitleEnabled: true,
  backgroundMusic: false,
  reviewConfirmed: false,
};

function statusLabel(status: MediaJobStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Rendering";
    case "completed":
      return "Draft ready";
    case "failed":
      return "Render failed";
  }
}

function authorizationHeaders(accessToken: string, json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (accessToken.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  }
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function parsePayload(response: Response): Promise<ApiPayload> {
  try {
    return (await response.json()) as ApiPayload;
  } catch {
    return { ok: false, error: "The server returned an unreadable response." };
  }
}

function downloadJson(report: MediaProductionReport, filename: string): void {
  const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printableReportHtml(report: MediaProductionReport): string {
  const reviewItems = report.governance.requiredReview
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const outputItems = report.render.outputs
    .map((output) => `<li class="mono">${escapeHtml(output)}</li>`)
    .join("");
  const signedStatus = report.integrity.signed
    ? `Signed with ${escapeHtml(report.integrity.signatureAlgorithm)}`
    : "SHA-256 integrity hash generated; HMAC signing not configured";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(report.reportId)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; }
    body { margin: 0; color: #10231c; background: #eef6f2; }
    main { max-width: 900px; margin: 32px auto; background: white; padding: 40px; border: 1px solid #cfe2d8; border-radius: 18px; }
    header { border-bottom: 3px solid #047857; padding-bottom: 20px; margin-bottom: 26px; }
    h1 { margin: 8px 0; font-size: 30px; }
    h2 { margin-top: 28px; font-size: 18px; color: #065f46; }
    p, li, td, th { font-size: 13px; line-height: 1.55; }
    .eyebrow { color: #047857; text-transform: uppercase; letter-spacing: .16em; font-weight: 700; font-size: 11px; }
    .status { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #fff7ed; color: #9a3412; font-weight: 700; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; vertical-align: top; padding: 9px 8px; border-bottom: 1px solid #e5e7eb; }
    th { width: 28%; color: #475569; }
    .mono { font-family: Consolas, Monaco, monospace; overflow-wrap: anywhere; }
    .integrity { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; }
    .notice { background: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 12px; }
    footer { margin-top: 30px; color: #64748b; font-size: 11px; }
    @media print { body { background: white; } main { margin: 0; border: 0; padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="eyebrow">DPAL Evidence Studio</div>
      <h1>Media Production Record</h1>
      <div class="status">DRAFT — HUMAN APPROVAL REQUIRED</div>
    </header>

    <table>
      <tr><th>Report ID</th><td class="mono">${escapeHtml(report.reportId)}</td></tr>
      <tr><th>Generated</th><td>${escapeHtml(report.generatedAt)}</td></tr>
      <tr><th>Project reference</th><td>${escapeHtml(report.project.reference || "Not supplied")}</td></tr>
      <tr><th>Video title</th><td>${escapeHtml(report.project.title)}</td></tr>
      <tr><th>Render task</th><td class="mono">${escapeHtml(report.render.taskId)}</td></tr>
      <tr><th>Format</th><td>${escapeHtml(report.render.configuration.aspect)}</td></tr>
      <tr><th>Language / voice</th><td>${escapeHtml(report.render.configuration.language)} / ${escapeHtml(report.render.configuration.voiceName)}</td></tr>
      <tr><th>Subtitles</th><td>${report.render.configuration.subtitlesEnabled ? "Enabled" : "Disabled"}</td></tr>
      <tr><th>Background music</th><td>${report.render.configuration.backgroundMusicEnabled ? "Enabled" : "Disabled"}</td></tr>
    </table>

    <h2>Evidence and outputs</h2>
    <p><strong>Evidence references:</strong> ${escapeHtml(report.evidence.references || "Not supplied")}</p>
    <ul>${outputItems}</ul>

    <h2>Required review</h2>
    <div class="notice">
      <p>${escapeHtml(report.governance.notice)}</p>
      <ul>${reviewItems}</ul>
    </div>

    <h2>Integrity</h2>
    <div class="integrity">
      <p><strong>${signedStatus}</strong></p>
      <p class="mono"><strong>Record SHA-256:</strong><br />${escapeHtml(report.integrity.recordSha256)}</p>
      <p class="mono"><strong>Script SHA-256:</strong><br />${escapeHtml(report.evidence.scriptSha256)}</p>
      ${report.integrity.signature ? `<p class="mono"><strong>Signature:</strong><br />${escapeHtml(report.integrity.signature)}</p>` : ""}
    </div>

    <footer>Generated by DPAL Evidence Studio. This record confirms render completion and input integrity; it is not final publication approval.</footer>
  </main>
  <script>window.addEventListener("load", function () { window.print(); });</script>
</body>
</html>`;
}

export default function MediaStudio() {
  const [form, setForm] = useState<StudioForm>(INITIAL_FORM);
  const [accessToken, setAccessToken] = useState("");
  const [health, setHealth] = useState<HealthState>("checking");
  const [healthMessage, setHealthMessage] = useState("Checking private renderer connection…");
  const [reportSigningConfigured, setReportSigningConfigured] = useState(false);
  const [job, setJob] = useState<MediaJob | null>(null);
  const [report, setReport] = useState<MediaProductionReport | null>(null);
  const [reportFilename, setReportFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkConnection = useCallback(async () => {
    setHealth("checking");
    setHealthMessage("Checking private renderer connection…");
    try {
      const response = await fetch("/api/media-studio", {
        method: "GET",
        headers: authorizationHeaders(accessToken),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await parsePayload(response);
      if (response.status === 401 || payload.requiresAccessToken) {
        setHealth("locked");
        setHealthMessage(payload.error || "Enter the operator access token to unlock Evidence Studio.");
        return;
      }
      if (!response.ok || !payload.ok) {
        setHealth("offline");
        setHealthMessage(payload.error || "The private media renderer is not reachable.");
        return;
      }
      setHealth("online");
      setReportSigningConfigured(Boolean(payload.reportSigningConfigured));
      setHealthMessage(
        `${payload.service || "DPAL Private Media Renderer"} is online. Video drafts and production reports are ready.`,
      );
      setError("");
    } catch {
      setHealth("offline");
      setHealthMessage("The DPAL server could not reach the private media renderer.");
    }
  }, [accessToken]);

  useEffect(() => {
    void checkConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") {
      return;
    }

    const controller = new AbortController();
    let active = true;
    const taskId = job.id;

    const poll = async () => {
      try {
        const response = await fetch(`/api/media-studio/${encodeURIComponent(taskId)}`, {
          method: "GET",
          headers: authorizationHeaders(accessToken),
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = await parsePayload(response);
        if (!active) return;
        if (!response.ok || !payload.ok || !payload.job) {
          setError(payload.error || "The render status could not be loaded.");
          return;
        }
        setJob(payload.job);
        if (payload.job.status === "completed") {
          setReport(null);
          setReportFilename("");
          setNotice(
            "Draft render complete. Review the video, then generate its hashed production record before any publication decision.",
          );
        }
      } catch (pollError) {
        if (active && !(pollError instanceof DOMException && pollError.name === "AbortError")) {
          setError("The render is still running, but its latest status could not be loaded.");
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 4_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [accessToken, job?.id, job?.status]);

  const hasActiveJob = job?.status === "queued" || job?.status === "processing";
  const canSubmit = useMemo(
    () =>
      health === "online" &&
      form.title.trim().length >= 3 &&
      form.script.trim().length >= 40 &&
      form.reviewConfirmed &&
      !hasActiveJob &&
      !submitting,
    [form.reviewConfirmed, form.script, form.title, hasActiveJob, health, submitting],
  );

  const updateField = <K extends keyof StudioForm>(field: K, value: StudioForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (report) {
      setReport(null);
      setReportFilename("");
    }
  };

  const submitJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.reviewConfirmed) {
      setError("Review the script and evidence references, then confirm the approval checkbox.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/media-studio", {
        method: "POST",
        headers: authorizationHeaders(accessToken, true),
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
      const payload = await parsePayload(response);
      if (response.status === 401 || payload.requiresAccessToken) {
        setHealth("locked");
        setHealthMessage("The operator access token was not accepted.");
        setError(payload.error || "Evidence Studio access token required.");
        return;
      }
      if (!response.ok || !payload.ok || !payload.job) {
        setError(payload.error || "The draft render could not be queued.");
        return;
      }
      setJob(payload.job);
      setReport(null);
      setReportFilename("");
      setNotice(payload.notice || "Draft render queued.");
    } catch {
      setError("The draft render could not be queued.");
    } finally {
      setSubmitting(false);
    }
  };

  const ensureProductionReport = async (): Promise<MediaProductionReport | null> => {
    if (report) return report;
    if (!job || job.status !== "completed") {
      setError("Complete the render before generating its production report.");
      return null;
    }

    setReportBusy(true);
    setError("");
    try {
      const response = await fetch("/api/media-studio/report", {
        method: "POST",
        headers: authorizationHeaders(accessToken, true),
        credentials: "same-origin",
        body: JSON.stringify({ ...form, taskId: job.id }),
      });
      const payload = await parsePayload(response);
      if (response.status === 401 || payload.requiresAccessToken) {
        setHealth("locked");
        setError(payload.error || "Evidence Studio access token required.");
        return null;
      }
      if (!response.ok || !payload.ok || !payload.report) {
        setError(payload.error || "The production report could not be generated.");
        return null;
      }
      setReport(payload.report);
      setReportFilename(payload.filename || `${payload.report.reportId.toLowerCase()}.json`);
      setNotice(payload.notice || "Production record generated.");
      return payload.report;
    } catch {
      setError("The production report could not be generated.");
      return null;
    } finally {
      setReportBusy(false);
    }
  };

  const handleDownloadReport = async () => {
    const currentReport = await ensureProductionReport();
    if (!currentReport) return;
    downloadJson(
      currentReport,
      reportFilename || `${currentReport.reportId.toLowerCase()}.json`,
    );
  };

  const handlePrintReport = async () => {
    const printWindow = window.open("", "_blank");
    const currentReport = await ensureProductionReport();
    if (!currentReport) {
      printWindow?.close();
      return;
    }
    if (!printWindow) {
      setError("Your browser blocked the report window. Allow pop-ups for DPAL and try again.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(printableReportHtml(currentReport));
    printWindow.document.close();
  };

  const healthDot =
    health === "online"
      ? "bg-emerald-400"
      : health === "checking"
        ? "bg-amber-400"
        : health === "locked"
          ? "bg-violet-400"
          : "bg-rose-400";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-950/60 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-black/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <span>DPAL Enterprise</span>
              <span className="text-slate-600">/</span>
              <span>Evidence Studio</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Governed video production
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Create evidence-grounded video drafts, monitor rendering, and issue a server-verified production record with integrity hashes before publication review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/enterprise"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ← Enterprise HQ
            </Link>
            <Link
              href="/"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-emerald-300"
            >
              DPAL Home
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Private renderer
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className={`h-3 w-3 rounded-full ${healthDot} ${health === "checking" ? "animate-pulse" : ""}`}
                  />
                  <span className="font-bold text-white">
                    {health === "online"
                      ? "Online"
                      : health === "locked"
                        ? "Protected"
                        : health === "checking"
                          ? "Checking"
                          : "Offline"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{healthMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => void checkConnection()}
                className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-400/20"
              >
                Recheck
              </button>
            </div>
            <label
              className="mt-5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400"
              htmlFor="studio-token"
            >
              Operator token{" "}
              <span className="font-normal normal-case tracking-normal text-slate-500">
                (only when configured)
              </span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="studio-token"
                type="password"
                value={accessToken}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setAccessToken(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter DPAL evidence token"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
              />
              <button
                type="button"
                onClick={() => void checkConnection()}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-100"
              >
                Unlock
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              The token goes only to the same-origin DPAL API and is never written to browser storage.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Governance boundary
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              A completed render is still a draft—not verified evidence.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Evidence Studio records the inputs, completed task, output paths, and integrity hashes. A human must still approve factual accuracy, geography, licensing, consent, privacy, narration, and captions.
            </p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-3">
                <strong className="block text-white">1. Ground</strong>Use a reviewed script and evidence references.
              </div>
              <div className="rounded-2xl bg-black/20 p-3">
                <strong className="block text-white">2. Render</strong>Create one controlled draft and preview it.
              </div>
              <div className="rounded-2xl bg-black/20 p-3">
                <strong className="block text-white">3. Record</strong>Generate the hashed production report.
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <form
            onSubmit={submitJob}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7"
          >
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                New production draft
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Build the evidence manifest</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Project reference</span>
                <input
                  value={form.projectReference}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("projectReference", event.target.value)
                  }
                  maxLength={120}
                  placeholder="e.g. DENSU-DELTA-2026"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Video title *</span>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  value={form.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="Mangrove monitoring update"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-200">
                <span>Approved narration script *</span>
                <span className="text-xs font-medium text-slate-500">{form.script.length}/8000</span>
              </span>
              <textarea
                required
                minLength={40}
                maxLength={8_000}
                rows={11}
                value={form.script}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  updateField("script", event.target.value)
                }
                placeholder="Paste the human-reviewed script. State only claims supported by the referenced evidence."
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
              />
            </label>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Evidence references</span>
                <textarea
                  rows={4}
                  maxLength={1_000}
                  value={form.evidenceReferences}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    updateField("evidenceReferences", event.target.value)
                  }
                  placeholder="Evidence IDs, report IDs, consent records, or approved source notes"
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Visual search keywords</span>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={form.visualKeywords}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    updateField("visualKeywords", event.target.value)
                  }
                  placeholder="mangrove restoration, coastal monitoring, field survey"
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Format</span>
                <select
                  value={form.aspect}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateField("aspect", event.target.value as StudioForm["aspect"])
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 focus:ring-2"
                >
                  <option value="9:16">Vertical 9:16</option>
                  <option value="16:9">Landscape 16:9</option>
                  <option value="1:1">Square 1:1</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Stock provider</span>
                <select
                  value={form.source}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateField("source", event.target.value as StudioForm["source"])
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 focus:ring-2"
                >
                  <option value="pexels">Pexels</option>
                  <option value="pixabay">Pixabay</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Language</span>
                <input
                  value={form.language}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("language", event.target.value)
                  }
                  maxLength={64}
                  placeholder="en"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Voice ID</span>
                <input
                  value={form.voiceName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("voiceName", event.target.value)
                  }
                  maxLength={160}
                  placeholder="en-US-JennyNeural-Female"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-emerald-400 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <input
                  type="checkbox"
                  checked={form.subtitleEnabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("subtitleEnabled", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-emerald-400"
                />
                <span>
                  <strong className="block text-sm text-white">Generate subtitles</strong>
                  <span className="text-xs leading-5 text-slate-400">
                    Burn readable captions into the draft.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <input
                  type="checkbox"
                  checked={form.backgroundMusic}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("backgroundMusic", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-emerald-400"
                />
                <span>
                  <strong className="block text-sm text-white">Add background music</strong>
                  <span className="text-xs leading-5 text-slate-400">
                    Enable only when the selected tracks have documented rights.
                  </span>
                </span>
              </label>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.07] p-4">
              <input
                required
                type="checkbox"
                checked={form.reviewConfirmed}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateField("reviewConfirmed", event.target.checked)
                }
                className="mt-1 h-4 w-4 accent-emerald-400"
              />
              <span>
                <strong className="block text-sm text-emerald-100">
                  I reviewed this script and its evidence references.
                </strong>
                <span className="mt-1 block text-xs leading-5 text-slate-300">
                  Stock footage is illustrative. The final draft still requires human factual, rights, consent, privacy, and geographic review.
                </span>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-100"
              >
                {error}
              </div>
            )}
            {notice && (
              <div
                aria-live="polite"
                className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"
              >
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {submitting
                ? "Queuing draft…"
                : hasActiveJob
                  ? "Current render is still running"
                  : health !== "online"
                    ? "Connect renderer to continue"
                    : "Render one governed draft"}
            </button>
          </form>

          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 xl:sticky xl:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
              Production monitor
            </p>
            {!job ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center">
                <div className="text-4xl">🎬</div>
                <h2 className="mt-3 font-black text-white">No active render</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The task ID, progress, protected preview, and production-report controls appear here after submission.
                </p>
              </div>
            ) : (
              <div className="mt-5" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      job.status === "completed"
                        ? "bg-emerald-400/15 text-emerald-200"
                        : job.status === "failed"
                          ? "bg-rose-400/15 text-rose-200"
                          : "bg-amber-400/15 text-amber-200"
                    }`}
                  >
                    {statusLabel(job.status)}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{job.progress}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{
                      width: `${Math.max(job.progress, job.status === "queued" ? 3 : 0)}%`,
                    }}
                  />
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-2xl bg-black/20 p-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Task ID
                    </dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-300">{job.id}</dd>
                  </div>
                  {job.failedStage && (
                    <div className="rounded-2xl bg-rose-400/10 p-3">
                      <dt className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        Failed stage
                      </dt>
                      <dd className="mt-1 text-rose-100">{job.failedStage}</dd>
                    </div>
                  )}
                  {job.error && (
                    <div className="rounded-2xl bg-rose-400/10 p-3">
                      <dt className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        Renderer message
                      </dt>
                      <dd className="mt-1 text-rose-100">{job.error}</dd>
                    </div>
                  )}
                </dl>

                {job.outputs.length > 0 && (
                  <div className="mt-5 space-y-5">
                    {job.outputs.map((output, index) => (
                      <div
                        key={output}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-black"
                      >
                        <video
                          src={output}
                          controls
                          preload="metadata"
                          className="aspect-video w-full bg-black"
                          aria-label={`Generated draft ${index + 1}`}
                        />
                        <div className="flex items-center justify-between gap-3 bg-slate-900 p-3">
                          <span className="text-xs font-bold text-slate-300">Draft {index + 1}</span>
                          <div className="flex gap-2">
                            <a
                              href={output}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/10"
                            >
                              Open
                            </a>
                            <a
                              href={output}
                              download
                              className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950 hover:bg-emerald-100"
                            >
                              Save MP4
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                        Production record
                      </p>
                      <h3 className="mt-2 font-black text-white">
                        Generate the report from the live completed task
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        The server rechecks render completion, hashes the script and canonical record, and optionally signs the record when a signing key is configured.
                      </p>
                      <div className="mt-4 grid gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownloadReport()}
                          disabled={reportBusy}
                          className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
                        >
                          {reportBusy ? "Generating record…" : "Download integrity report (JSON)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePrintReport()}
                          disabled={reportBusy}
                          className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                        >
                          Print / Save report as PDF
                        </button>
                      </div>
                      {report && (
                        <div className="mt-4 rounded-xl bg-black/25 p-3 text-xs text-slate-300">
                          <strong className="block text-emerald-200">{report.reportId}</strong>
                          <span className="mt-1 block break-all font-mono text-[10px] text-slate-500">
                            SHA-256: {report.integrity.recordSha256}
                          </span>
                          <span className="mt-2 block">
                            {report.integrity.signed
                              ? "HMAC signature included."
                              : "Integrity hash included; signing key is not configured."}
                          </span>
                        </div>
                      )}
                      {!report && (
                        <p className="mt-3 text-[11px] leading-5 text-slate-500">
                          Signing status: {reportSigningConfigured ? "configured" : "hash-only mode"}.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-5 text-amber-100">
                      <strong className="block">Publication approval is still pending.</strong>
                      The production record proves what DPAL sent and what task completed. It does not independently verify stock imagery or authorize distribution.
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
