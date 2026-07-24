# DPAL Media Studio — MoneyPrinterTurbo integration

This integration keeps MoneyPrinterTurbo outside the Next.js process and exposes a narrow, server-side DPAL adapter.

## Architecture

```text
Browser /media-studio
        |
        | same-origin JSON + protected MP4 requests
        v
Next.js /api/media-studio/*
        |
        | private server-to-server HTTP
        v
MoneyPrinterTurbo API :8080
```

The browser never receives `MONEYPRINTER_API_URL`, `MONEYPRINTER_API_KEY`, or the renderer's internal asset URL. Generated `/tasks/...` files are streamed through the DPAL asset proxy with HTTP Range support.

The adapter contract was reviewed against MoneyPrinterTurbo `main` at commit `3c4df9f5d1b9b9d239aa52fd538b7555e4d2af86` and uses:

- `GET /ping`
- `POST /api/v1/videos`
- `GET /api/v1/tasks/{task_id}`
- `GET /tasks/...` for generated assets

## 1. Deploy MoneyPrinterTurbo separately

Use a reviewed fork or a pinned upstream release. The upstream release compose file runs the API from `ghcr.io/harry0703/moneyprinterturbo:latest` on port `8080`.

```bash
git clone https://github.com/harry0703/MoneyPrinterTurbo.git
cd MoneyPrinterTurbo
cp config.example.toml config.toml

docker compose -f docker-compose.release.yml up -d api
```

For production, pin the container digest or release tag rather than following `latest` indefinitely.

Configure the renderer's LLM, voice, stock-media provider, fonts, FFmpeg, and storage settings in its `config.toml`. Keep the API on a private network or loopback interface. Do not expose port `8080` directly to the public internet.

## 2. Configure the DPAL dashboard

Copy `.env.local.example` to `.env.local`, then set the server-only values:

```dotenv
MONEYPRINTER_API_URL="http://127.0.0.1:8080"
MONEYPRINTER_API_KEY=""
MONEYPRINTER_REQUEST_TIMEOUT_MS="15000"
DPAL_MEDIA_STUDIO_ACCESS_TOKEN="replace-with-a-long-random-operator-token"
```

`MONEYPRINTER_API_KEY` is optional because upstream authentication is disabled by default. Set it when the MoneyPrinterTurbo router is configured to verify `x-api-key`.

`DPAL_MEDIA_STUDIO_ACCESS_TOKEN` is required when the Next.js app runs in production and protects DPAL's costly render endpoints. The operator enters it in Media Studio. After validation, DPAL establishes an eight-hour, HTTP-only, same-site cookie so the browser's video player can request protected byte ranges without exposing the token in a URL.

If the Next.js app runs on Vercel while MoneyPrinterTurbo runs elsewhere, `127.0.0.1` will not work. Use a private service URL reachable from the Next.js runtime, or deploy both services in the same protected network.

## 3. Open Media Studio

Run the dashboard and open:

```text
/media-studio
```

The enterprise dashboard also includes a floating **Media Studio** entry point.

## DPAL routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/media-studio` | Authenticate and check `/ping` |
| `POST` | `/api/media-studio` | Validate a reviewed manifest and queue one draft |
| `GET` | `/api/media-studio/{taskId}` | Poll normalized task status |
| `GET` | `/api/media-studio/assets/tasks/...` | Stream a generated asset with Range support |

## Deliberate safeguards

- A human must confirm that the narration script and evidence references were reviewed.
- The adapter submits an explicit script instead of asking the renderer to invent DPAL facts.
- One video is generated per request.
- Output URLs are restricted to MoneyPrinterTurbo's `/tasks/` directory.
- Renderer credentials and internal URLs remain server-side.
- No automatic YouTube, TikTok, Instagram, or other publishing endpoint is exposed.
- Background music is off by default. Enable it only after replacing upstream samples with tracks whose rights are documented.
- The completed output is labeled as a draft and still requires factual, geographic, consent, privacy, and licensing review.

## Production checklist

1. Pin and review the MoneyPrinterTurbo fork or image digest.
2. Run the renderer on a private network with persistent `storage` mounted.
3. Configure `DPAL_MEDIA_STUDIO_ACCESS_TOKEN` with a long random value.
4. Enable MoneyPrinterTurbo `x-api-key` verification in the reviewed fork and set `MONEYPRINTER_API_KEY` in DPAL.
5. Replace bundled music and verify every stock-media provider's license and API terms.
6. Disable any renderer-level cross-post or auto-publish configuration.
7. Put the Next.js dashboard behind DPAL authentication and authorization.
8. Add durable DPAL database records for render manifests, reviewer decisions, consent records, and final SHA-256 hashes before treating videos as governed evidence artifacts.

## Current persistence boundary

This branch queues and monitors renders but does not add a new DPAL database table. Project and evidence references are returned with the initial render manifest and remain visible in the operator form; they are not yet written to an institutional audit ledger. Add that persistence in the DPAL backend before production evidence governance or automated publishing.
