"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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

type ApiPayload = {
  ok?: boolean;
  error?: string;
  requiresAccessToken?: boolean;
  protected?: boolean;
  job?: MediaJob;
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

export default function MediaStudio() {
  const [form, setForm] = useState<StudioForm>(INITIAL_FORM);
  const [accessToken, setAccessToken] = useState("");
  const [health, setHealth] = useState<HealthState>("checking");
  const [healthMessage, setHealthMessage] = useState("Checking renderer connection…");
  const [job, setJob] = useState<MediaJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkConnection = useCallback(async () => {
    setHealth("checking");
    setHealthMessage("Checking renderer connection…");
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
        setHealthMessage(payload.error || "Enter the operator access token to unlock Media Studio.");
        return;
      }
      if (!response.ok || !payload.ok) {
        setHealth("offline");
        setHealthMessage(payload.error || "MoneyPrinterTurbo is not reachable.");
        return;
      }
      setHealth("online");
      setHealthMessage("MoneyPrinterTurbo API is online and ready for draft renders.");
      setError("");
    } catch {
      setHealth("offline");
      setHealthMessage("The DPAL server could not reach MoneyPrinterTurbo.");
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

    const poll = async () => {
      try {
        const response = await fetch(`/api/media-studio/${encodeURIComponent(job.id)}`, {
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
          setNotice("Draft render complete. Review every claim, image, caption, and consent record before publishing.");
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
        setError(payload.error || "Media Studio access token required.");
        return;
      }
      if (!response.ok || !payload.ok || !payload.job) {
        setError(payload.error || "The draft render could not be queued.");
        return;
      }
      setJob(payload.job);
      setNotice(payload.notice || "Draft render queued.");
    } catch {
      setError("The draft render could not be queued.");
    } finally {
      setSubmitting(false);
    }
  };

  const healthDot =
    health === "online"
      ? "bg-emerald-500"
      : health === "checking"
        ? "bg-amber-400"
        : health === "locked"
          ? "bg-violet-500"
          : "bg-rose-500";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              <span>DPAL Enterprise</span>
              <span className="text-slate-600">/</span>
              <span>Media Studio</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Evidence-grounded video drafts</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Send an approved script to MoneyPrinterTurbo, monitor the render, and review the finished MP4 inside DPAL before anything is published.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/enterprise" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              ← Enterprise HQ
            </Link>
            <Link href="/" className="rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-300">
              DPAL Home
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Renderer status</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${healthDot} ${health === "checking" ? "animate-pulse" : ""}`} />
                  <span className="font-bold text-white">
                    {health === "online" ? "Online" : health === "locked" ? "Protected" : health === "checking" ? "Checking" : "Offline"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{healthMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => void checkConnection()}
                className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-400/20"
              >
                Recheck
              </button>
            </div>
            <label className="mt-5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400" htmlFor="studio-token">
              Operator token <span className="font-normal normal-case tracking-normal text-slate-500">(only when configured)</span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="studio-token"
                type="password"
                value={accessToken}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setAccessToken(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter DPAL media token"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 transition placeholder:text-slate-600 focus:ring-2"
              />
              <button
                type="button"
                onClick={() => void checkConnection()}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-100"
              >
                Unlock
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">The token is sent only to the same-origin DPAL API and is not written to browser storage.</p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Publishing safeguard</p>
            <h2 className="mt-2 text-xl font-black text-white">MoneyPrinterTurbo produces a draft—not verified evidence.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Check geographic accuracy, licenses, consent, subtitles, narration, and every factual claim. This integration deliberately includes no automatic social-media publishing action.
            </p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-3"><strong className="block text-white">1. Ground</strong>Use an approved script.</div>
              <div className="rounded-2xl bg-black/20 p-3"><strong className="block text-white">2. Render</strong>Create one controlled draft.</div>
              <div className="rounded-2xl bg-black/20 p-3"><strong className="block text-white">3. Review</strong>Approve outside this renderer.</div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <form onSubmit={submitJob} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">New draft</p>
              <h2 className="mt-2 text-2xl font-black text-white">Build the render manifest</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Project reference</span>
                <input
                  value={form.projectReference}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("projectReference", event.target.value)}
                  maxLength={120}
                  placeholder="e.g. DENSU-DELTA-2026"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Video title *</span>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  value={form.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("title", event.target.value)}
                  placeholder="Mangrove monitoring update"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 transition placeholder:text-slate-600 focus:ring-2"
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
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField("script", event.target.value)}
                placeholder="Paste the human-reviewed script. State only claims supported by the referenced evidence."
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none ring-sky-400 transition placeholder:text-slate-600 focus:ring-2"
              />
            </label>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Evidence references</span>
                <textarea
                  rows={4}
                  maxLength={1_000}
                  value={form.evidenceReferences}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField("evidenceReferences", event.target.value)}
                  placeholder="Evidence IDs, report IDs, consent records, or approved source notes"
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none ring-sky-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Visual search keywords</span>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={form.visualKeywords}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField("visualKeywords", event.target.value)}
                  placeholder="mangrove restoration, coastal monitoring, field survey"
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none ring-sky-400 transition placeholder:text-slate-600 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Format</span>
                <select value={form.aspect} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateField("aspect", event.target.value as StudioForm["aspect"])} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 focus:ring-2">
                  <option value="9:16">Vertical 9:16</option>
                  <option value="16:9">Landscape 16:9</option>
                  <option value="1:1">Square 1:1</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Stock provider</span>
                <select value={form.source} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateField("source", event.target.value as StudioForm["source"])} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 focus:ring-2">
                  <option value="pexels">Pexels</option>
                  <option value="pixabay">Pixabay</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Language</span>
                <input value={form.language} onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("language", event.target.value)} maxLength={64} placeholder="en" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 focus:ring-2" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-200">Voice ID</span>
                <input value={form.voiceName} onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("voiceName", event.target.value)} maxLength={160} placeholder="en-US-JennyNeural-Female" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-sky-400 focus:ring-2" />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <input type="checkbox" checked={form.subtitleEnabled} onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("subtitleEnabled", event.target.checked)} className="mt-1 h-4 w-4 accent-sky-400" />
                <span><strong className="block text-sm text-white">Generate subtitles</strong><span className="text-xs leading-5 text-slate-400">Burn readable captions into the draft.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <input type="checkbox" checked={form.backgroundMusic} onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("backgroundMusic", event.target.checked)} className="mt-1 h-4 w-4 accent-sky-400" />
                <span><strong className="block text-sm text-white">Add background music</strong><span className="text-xs leading-5 text-slate-400">Enable only after replacing upstream sample music with rights-cleared tracks.</span></span>
              </label>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.07] p-4">
              <input required type="checkbox" checked={form.reviewConfirmed} onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("reviewConfirmed", event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-400" />
              <span>
                <strong className="block text-sm text-emerald-100">I reviewed this script and its evidence references.</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-300">The renderer may select illustrative stock footage; the final draft still requires human factual, rights, consent, and geographic review.</span>
              </span>
            </label>

            {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>}
            {notice && <div aria-live="polite" className="mt-5 rounded-2xl border border-sky-300/25 bg-sky-400/10 p-4 text-sm text-sky-100">{notice}</div>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {submitting
                ? "Queuing draft…"
                : hasActiveJob
                  ? "Current render is still running"
                  : health !== "online"
                    ? "Connect renderer to continue"
                    : "Render one reviewable draft"}
            </button>
          </form>

          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 xl:sticky xl:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Render monitor</p>
            {!job ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center">
                <div className="text-4xl">🎬</div>
                <h2 className="mt-3 font-black text-white">No active render</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">The task ID, progress, and protected preview will appear here after submission.</p>
              </div>
            ) : (
              <div className="mt-5" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${job.status === "completed" ? "bg-emerald-400/15 text-emerald-200" : job.status === "failed" ? "bg-rose-400/15 text-rose-200" : "bg-amber-400/15 text-amber-200"}`}>
                    {statusLabel(job.status)}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{job.progress}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${Math.max(job.progress, job.status === "queued" ? 3 : 0)}%` }} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-2xl bg-black/20 p-3"><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Task ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-300">{job.id}</dd></div>
                  {job.failedStage && <div className="rounded-2xl bg-rose-400/10 p-3"><dt className="text-xs font-bold uppercase tracking-wider text-rose-300">Failed stage</dt><dd className="mt-1 text-rose-100">{job.failedStage}</dd></div>}
                  {job.error && <div className="rounded-2xl bg-rose-400/10 p-3"><dt className="text-xs font-bold uppercase tracking-wider text-rose-300">Renderer message</dt><dd className="mt-1 text-rose-100">{job.error}</dd></div>}
                </dl>

                {job.outputs.length > 0 && (
                  <div className="mt-5 space-y-5">
                    {job.outputs.map((output, index) => (
                      <div key={output} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                        <video src={output} controls preload="metadata" className="aspect-video w-full bg-black" aria-label={`Generated draft ${index + 1}`} />
                        <div className="flex items-center justify-between gap-3 bg-slate-900 p-3">
                          <span className="text-xs font-bold text-slate-300">Draft {index + 1}</span>
                          <div className="flex gap-2">
                            <a href={output} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/10">Open</a>
                            <a href={output} download className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950 hover:bg-sky-100">Save MP4</a>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-5 text-amber-100">
                      <strong className="block">Approval still pending.</strong>
                      Do not treat generated stock imagery or narration as verified evidence. Record final approval in the DPAL workflow before distribution.
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
