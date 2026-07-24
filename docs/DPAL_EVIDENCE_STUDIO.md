# DPAL Evidence Studio

**DPAL Evidence Studio** is the product name for DPAL's governed video-drafting workflow. It creates reviewable MP4 drafts through a private renderer and issues a server-verified media production record after a render completes.

The renderer is deliberately isolated from the Next.js application. The browser never receives its private URL, API key, signing key, or internal asset paths.

## Architecture

```text
Browser /media-studio
        |
        | same-origin protected JSON + MP4 byte-range requests
        v
Next.js /api/media-studio/*
        |
        | private server-to-server HTTP
        v
Private media renderer
```

Generated `/tasks/...` MP4 files are streamed through DPAL's same-origin asset proxy with HTTP Range support. Render submissions are explicit and human-reviewed; Evidence Studio does not expose any social-media auto-publishing endpoint.

## Product naming and renderer compatibility

The DPAL product is **Evidence Studio**. The current adapter remains compatible with the open-source MoneyPrinterTurbo API contract reviewed at upstream commit `3c4df9f5d1b9b9d239aa52fd538b7555e4d2af86`:

- `GET /ping`
- `POST /api/v1/videos`
- `GET /api/v1/tasks/{task_id}`
- `GET /tasks/...` for generated assets

That compatibility is an implementation detail, not the public DPAL product name. A reviewed fork, pinned image, or another renderer implementing the same narrow contract can be used behind DPAL.

## 1. Deploy the private renderer

Run the renderer separately from Next.js, preferably in a private network with persistent storage. For the currently supported upstream implementation:

```bash
git clone https://github.com/harry0703/MoneyPrinterTurbo.git
cd MoneyPrinterTurbo
cp config.example.toml config.toml
docker compose -f docker-compose.release.yml up -d api
```

For production:

1. Pin a reviewed release tag or container digest instead of following `latest`.
2. Keep port `8080` private; expose it only to the DPAL server runtime.
3. Mount persistent storage for generated assets.
4. Configure the renderer's model, voice, stock-media providers, fonts, FFmpeg, and licensing controls.
5. Enable and verify an upstream `x-api-key` in the reviewed deployment.
6. Disable renderer-level cross-posting or automatic publication.

## 2. Configure DPAL

Set these server-only environment variables in `.env.local` and in the deployment secret manager:

```dotenv
DPAL_MEDIA_RENDERER_URL="http://127.0.0.1:8080"
DPAL_MEDIA_RENDERER_API_KEY=""
DPAL_MEDIA_RENDERER_TIMEOUT_MS="15000"
DPAL_MEDIA_STUDIO_ACCESS_TOKEN="replace-with-a-long-random-operator-token"
DPAL_MEDIA_REPORT_SIGNING_KEY="replace-with-a-separate-long-random-signing-key"
```

### Environment rules

- `DPAL_MEDIA_RENDERER_URL` must be reachable from the **Next.js server**, not from the operator's browser.
- `127.0.0.1` works only when Next.js and the renderer share the same host/network namespace. A Vercel function cannot reach a renderer running on a separate personal computer through `127.0.0.1`.
- `DPAL_MEDIA_STUDIO_ACCESS_TOKEN` is required in production. Successful operator authentication establishes an eight-hour HTTP-only, SameSite=Strict cookie scoped to `/api/media-studio`.
- `DPAL_MEDIA_REPORT_SIGNING_KEY` is strongly recommended. It adds an HMAC-SHA256 signature to each production record. Use a different secret from the access token.
- Legacy `MONEYPRINTER_API_URL`, `MONEYPRINTER_API_KEY`, and `MONEYPRINTER_REQUEST_TIMEOUT_MS` values remain accepted during migration. New deployments should use the DPAL names.

## 3. Evidence Studio routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/media-studio` | Authenticate, check renderer health, and report signing readiness |
| `POST` | `/api/media-studio` | Validate a reviewed manifest and queue one draft |
| `GET` | `/api/media-studio/{taskId}` | Poll normalized render status |
| `GET` | `/api/media-studio/assets/tasks/...` | Stream a protected MP4 with HTTP Range support |
| `POST` | `/api/media-studio/report` | Recheck a completed task and issue its production record |

The operator interface remains at:

```text
/media-studio
```

The stable route is intentionally retained for backward compatibility even though the product is now named DPAL Evidence Studio.

## Production record contents

A report can be issued only after the server rechecks the task and confirms that it has a completed MP4 output. The JSON production record includes:

- DPAL report ID and UTC generation time
- project reference and title
- renderer task ID, completion state, and protected output paths
- aspect ratio, language, voice, stock source, subtitle, music, and visual-keyword configuration
- supplied evidence references
- SHA-256 hash of the approved narration script
- SHA-256 hash of the evidence-reference field when present
- SHA-256 hash of the canonical report record
- optional HMAC-SHA256 signature when `DPAL_MEDIA_REPORT_SIGNING_KEY` is configured
- explicit statement that publication remains unapproved
- required factual, geographic, rights, consent, privacy, narration, and subtitle review

The UI supports:

- **Download integrity report (JSON)** for machine-readable retention
- **Print / Save report as PDF** using the browser's print-to-PDF workflow

## Security and governance safeguards

- Renderer URL, API key, signing key, and internal storage paths remain server-side.
- Input fields are allow-listed, normalized, and length-limited.
- The operator must affirm that the script and evidence references were reviewed.
- Only one output is requested per render.
- Unsafe asset paths, traversal attempts, unexpected file types, and invalid task IDs are rejected.
- The MP4 proxy supports byte ranges without exposing the renderer URL.
- Background music is disabled by default.
- No automatic YouTube, TikTok, Instagram, or other publishing route exists.
- A production record confirms render completion and input integrity; it does **not** make stock imagery independently true or grant publication approval.

## Verification checklist

Before merging or deploying a change:

1. Run `npm run build` against the final commit.
2. Confirm `/api/media-studio` returns a protected health response.
3. Queue one controlled, non-sensitive test script.
4. Confirm status polling reaches `completed`.
5. Confirm the MP4 plays and supports seeking through the DPAL proxy.
6. Download the JSON report and verify its task ID and output path match the completed render.
7. Print/save the report as PDF.
8. Confirm the report includes a signature when the signing key is configured.
9. Confirm no renderer URL or secret appears in browser source, network payloads, or generated reports.
10. Complete a human factual, rights, consent, privacy, and geographic review before publication.

## Persistence boundary

Evidence Studio now generates a hashed, optionally signed production record, but this repository still does not add a DPAL database table or institutional ledger write. Downloaded JSON/PDF reports must be retained in the project's governed evidence store until backend persistence is added.

For full institutional governance, persist the original manifest, reviewer identity and decision, consent and license records, final approved asset hash, report hash/signature, publication destination, and revocation history in the DPAL backend.
