# Chroma

> Dominant colours and their exact share — from any image, URL, or website.

Upload an image (drag-drop, click, or paste a URL) and get back the dominant colours with their exact share of the pixels — as an interactive palette with swatches, a donut chart, copy-on-click in HEX / RGB / HSL / OKLCH, and one-click export to CSS variables, a Tailwind config, `.ase`, `.json`, or a `.png` palette.

- **Live:** https://palette.ontwrpn.com
- **API docs:** https://palette.ontwrpn.com/docs

## Why I built this

Most colour pickers give you a palette but not the *proportion* each colour occupies — which is exactly what matters when you're building a brand or a UI theme from a reference image. `extcolors` returns pixel counts out of the box, so the percentage split is real, not eyeballed.

## Features

- Upload via drag-drop, file picker, image URL, or clipboard paste (Cmd/Ctrl+V).
- Dominant colours with **true percentage** of total pixels.
- Two extraction engines:
  - **Fast** — [`extcolors`](https://github.com/CairX/extract-colors-py), perceptual grouping (CIE76) with adjustable tolerance.
  - **Precision** — K-Means clustering in **LAB** colour space, closer to human perception.
- Each swatch in HEX / RGB / HSL / OKLCH, click to copy.
- SVG donut chart of the proportions (zero charting dependencies).
- Export: CSS variables, Tailwind `theme.extend.colors`, Adobe `.ase`, `.json`, and a rendered `.png` palette.
- Dark mode, responsive, keyboard shortcuts.

## Tech stack & decisions

**Backend** — Python 3.12, FastAPI + Uvicorn, Pillow (pre-processing), `extcolors` (fast engine), scikit-learn + NumPy (precision engine), httpx (URL fetch).

**Frontend** — Vite + React 18 + TypeScript, Tailwind CSS, `react-dropzone`, `lucide-react`.

Key decisions:

- **`extcolors` over ColorThief** — ColorThief is the most popular library but only returns colours; you have to count pixels after quantisation yourself. `extcolors` returns `[((r,g,b), pixel_count), ...]`, so proportions come for free and it exposes `tolerance` (perceptual grouping) and `limit`.
- **Fast vs precision** — K-Means on raw RGB gives muddy results; running it in LAB is much closer to perception, but it's slower, so it's opt-in behind a "precision mode" toggle.
- **Always resize before extracting** — 4K / 50 MP phone photos make CIE76 take seconds and can blow past a modest container memory limit. Images are downscaled to ≤512 px on the long side first.

## Project structure

```
colour-palette-analysis/
├── backend/          FastAPI app (app/main.py, services/, schemas.py), tests/
├── frontend/         Vite + React + TS (src/components, lib, hooks)
├── Dockerfile        Multi-stage build → single nginx + uvicorn container
├── nginx.conf        Serves the built SPA, proxies /api/* and /health
├── start.sh          Container entrypoint (supervises uvicorn, runs nginx)
└── .github/workflows CI: backend (lint + tests), frontend (build), docker (build + smoke test)
```

## Local setup

No image is ever written to disk — everything is processed in memory.

**Backend** (Python 3.10+; the container runs 3.12):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload          # http://localhost:8000  (/docs for Swagger)
pytest                                  # run the test suite
```

**Frontend** (Node 18+):

```bash
cd frontend
npm install
npm run dev                             # http://localhost:5173
```

Set `VITE_API_BASE_URL` in `frontend/.env` to point at the backend (defaults to `http://localhost:8000`).

## API

| Method | Path                | Description                                         |
|--------|---------------------|-----------------------------------------------------|
| POST   | `/api/extract`      | multipart file upload → palette JSON                |
| POST   | `/api/extract-url`  | `{ "url": "..." }` → palette JSON                   |
| GET    | `/health`           | liveness probe (used by the container health check) |

Interactive schema at `/docs`.

## Deploy

Chroma ships as **one Docker container**, deployed via [Coolify](https://coolify.io/) on a self-hosted host at [palette.ontwrpn.com](https://palette.ontwrpn.com).

The multi-stage [`Dockerfile`](./Dockerfile) builds the Vite frontend, then layers it onto a Python image that runs both processes:

- **nginx** (port 80) serves the built SPA and proxies `/api/*` and `/health` to uvicorn.
- **uvicorn** (127.0.0.1:8000) runs the FastAPI backend, supervised by [`start.sh`](./start.sh) so it restarts if it ever exits.
- A `HEALTHCHECK` probes `/health` *through* nginx, so a dead ingress or a backend that won't stay up flips the container unhealthy and Coolify restarts it.

Because nginx proxies the API on the same origin, the frontend calls relative `/api/…` URLs (no `VITE_API_BASE_URL` needed in production).

**Required env var:** `ALLOWED_ORIGINS` — comma-separated origins the backend accepts (e.g. `https://palette.ontwrpn.com`). Set it in Coolify under Configuration → Environment Variables.

To redeploy: push to `main` (Coolify auto-deploys), or trigger a manual redeploy from the Coolify dashboard. The image is built straight from the `Dockerfile`; there is no separate build command to keep in sync.

## Roadmap

AI mood tagging (warm/cool/calm/energetic), complementary-palette suggestions, saved palettes, public gallery, browser extension, Figma plugin. See the project plan for the full backlog.
