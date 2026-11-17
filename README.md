# PNR Status site

Enter a valid 10-digit PNR and the journey details (route, train, date, class, quota, passenger status) fill in automatically.

- `index.html`: the frontend (summary-sheet layout), no build step. `manifest.webmanifest` + `icon.svg` make it installable on a phone home screen.
- `functions/api/pnr.js`: Cloudflare Pages Function at `/api/pnr`. It validates the PNR, encrypts it (AES-128-CBC, same as `chunkboi/pnr-status`), and calls EaseMyTrip's `Train/PnrchkStatus` endpoint. No API key or environment variables needed.

## Deploy free on Cloudflare Pages

1. Put this folder in a GitHub repo.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build command: none. Output directory: `/` (repo root).

## Local test

```
npx wrangler pages dev .
```

Then open the printed URL and enter a real PNR.

## Caveats

- The endpoint is private and unofficial. The upstream repo is archived and marked unmaintained, so it can change, rate-limit or block Cloudflare's IPs at any time. If lookups start failing, that is the first suspect.
- Using it may go against EaseMyTrip's terms. Keep traffic low and treat this as a personal project.
- Nothing is stored. PNR data includes passenger details, so don't add logging or analytics that capture it.
- Unofficial tool: verify on IRCTC before travelling.
