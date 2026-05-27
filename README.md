# colour-palette-analysis

> Extract dominant colours from any image, with proportions.

Upload an image (drag-drop, click, or paste a URL) and get back the dominant colours with their exact share of the pixels — as an interactive palette with swatches, a donut chart, copy-on-click in HEX / RGB / HSL / OKLCH, and one-click export to CSS variables, a Tailwind config, `.ase`, `.json`, or a `.png` palette.

- **Live:** https://colour-palette-analysis-web.onrender.com
- **API docs:** https://colour-palette-analysis-api.onrender.com/docs

> ⚠️ Hosted on Render's free tier — the first request after a period of inactivity can take up to a minute while the service wakes from cold start.

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
- **Always resize before extracting** — 4K / 50 MP phone photos make CIE76 take seconds and blow past Render's 512 MB. Images are downscaled to ≤512 px on the long side first.

## Project structure

```
colour-palette-analysis/
├── backend/          FastAPI app (app/main.py, services/, schemas.py), tests/
├── frontend/         Vite + React + TS (src/components, lib, hooks)
├── render.yaml       Infrastructure-as-Code: API web service + static site
└── .github/workflows CI: lint + tests (backend), build (frontend)
```

## Local setup

No image is ever written to disk — everything is processed in memory.

**Backend** (Python 3.10+; Render runs 3.12):

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

| Method | Path                | Description                                  |
|--------|---------------------|----------------------------------------------|
| POST   | `/api/extract`      | multipart file upload → palette JSON         |
| POST   | `/api/extract-url`  | `{ "url": "..." }` → palette JSON            |
| GET    | `/health`           | liveness probe for Render                    |

Interactive schema at `/docs`.

## Roadmap

AI mood tagging (warm/cool/calm/energetic), complementary-palette suggestions, saved palettes, public gallery, browser extension, Figma plugin. See the project plan for the full backlog.
