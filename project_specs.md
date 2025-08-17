
I have a detailed spec for a YouTube thumbnail generator app that I want to build as a portfolio project. Please help me implement it step-by-step, focusing on clean, well-documented code that demonstrates best practices.

# Project Specs — Local YouTube Thumbnail Generator

## 1) Overview
- Purpose: Generate branded YouTube thumbnails locally by combining an AI-generated background with readable title text and an optional logo.
- User: Solo creator; local execution (no cloud backend beyond OpenAI Images API).
- Output: JPEG 1280×720, ≤ 2 MB, high contrast, brand-consistent.

## 2) Scope
- In-scope:
  - Generate background via OpenAI Images (gpt-image-1).
  - Compose text (stroke/shadow), accent bar/brand color, optional logo overlay.
  - Download/view result and list recent thumbnails.
- Out-of-scope (initial):
  - Multi-user auth, queues, teams, cloud storage, advanced template editor.

## 3) Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS, TanStack Query, React Hook Form, Axios.
- Backend: FastAPI (Uvicorn), Pydantic/Pydantic Settings, Pillow, httpx, python-multipart.
- Packaging (optional): Tauri (desktop wrapper).
- Runtime: Local only; API key stored server-side.

## 4) Directory Structure
app/
  frontend/                # React app (Vite)
    src/
      api/                 # query hooks
      components/          # Form, Preview, Gallery
      pages/
      styles/
      types/
    index.html
  backend/                 # FastAPI app
    main.py                # app factory, CORS, router
    routes/
      thumbnails.py        # /api endpoints
    services/
      openai_client.py     # image generation
      pillow_utils.py      # text/logo composition, export
    models.py              # Pydantic schemas
    settings.py            # env config
    requirements.txt
  data/
    thumbnails/            # generated assets
  .env                     # only backend reads

## 5) API Contracts

POST /api/generate
- Request: multipart/form-data
  - title: string (required, 5–120 chars)
  - topic: string (required, 3–160 chars)
  - accentColor: string hex (optional, default "#FFD000")
  - logo: file (optional, PNG/JPG, ≤ 2 MB)
- Response 200 (application/json):
  {
    "filename": "YYYY-MM-DD_HHMMSS_thumbnail.jpg",
    "width": 1280,
    "height": 720,
    "sizeBytes": <int>,
    "url": "/api/files/…"
  }
- Errors: 400 (validation), 502 (image service), 500 (composition)

GET /api/thumbnails
- Response 200: [{ filename, sizeBytes }…]

GET /api/files/{filename}
- Serves image from data/thumbnails (Content-Type: image/jpeg)

GET /api/health (optional)
- 200: { "status": "ok" }

## 6) Image Generation & Composition

Background (OpenAI Images)
- Model: gpt-image-1
- Prompt scaffold:
  "Vibrant YouTube thumbnail background, 16:9, strong focal composition,
   high readability area on the left, cinematic lighting, bold contrast,
   no text, related to: {topic}. Graphic design look."
- Size preference: 1536×864 (fallback 1024×1024 then center-crop to 16:9)

Composition (Pillow)
- Canvas resized to 1280×720
- Title:
  - Font: brand bold (e.g., Montserrat/Anton/Impact, system fallback)
  - Shadow: Gaussian blur; Stroke: 6px black; Fill: white
  - Placement: left column; dynamic wrapping to fit
  - Accent: 10px bar above title in accentColor
- Logo (optional):
  - RGBA, bottom-right, width ≈ 18% of canvas; preserve aspect
- Export:
  - JPEG progressive, subsampling=0, quality 92→76 loop to stay ≤ 2 MB

## 7) Validation Rules
- title: 5–120 chars; strip whitespace
- topic: 3–160 chars
- accentColor: /^#([0-9a-fA-F]{6})$/
- logo: MIME image/png or image/jpeg; size ≤ 2 MB
- Reject traversal in filename serving; whitelist directory

## 8) Configuration (.env)
- OPENAI_API_KEY=sk-...
- OPENAI_IMAGE_SIZE=1536x864
- DATA_DIR=./data/thumbnails
- CORS_ORIGIN=http://localhost:5173
- LOG_LEVEL=INFO

## 9) Security & Privacy
- API key only on backend; never exposed to frontend.
- CORS restricted to local dev origin.
- Fixed output directory; sanitize file paths.
- Validate uploads (size/type); discard temp files.

## 10) Error Handling & Logging
- Map upstream errors to 502 with friendly message.
- Log: request id, prompt (topic only), size, duration, exceptions.
- Return JSON error bodies with code and hint.

## 11) Build & Run (dev)
Backend:
  python -m venv .venv && source .venv/bin/activate
  pip install -r backend/requirements.txt
  uvicorn backend.main:app --reload --port 8000
Frontend:
  npm i
  npm run dev  # http://localhost:5173

## 12) Testing
- Backend: pytest for routes/utilities (dimensions, ≤2 MB check, MIME checks).
- Frontend: Vitest + React Testing Library; Playwright for E2E (form → image).

## 13) Non-Functional Requirements
- Performance: single image round-trip ≤ 6 s on typical connection.
- Reliability: graceful fallback size; clear user error states.
- Maintainability: typed models (Pydantic/TS); modular services.
- Accessibility: sufficient color contrast; keyboard usable form.

## 14) Roadmap (Post-MVP)
- Variants (2–4 backgrounds) and side-by-side picker
- Preset templates per niche (tech/gaming/cooking)
- Background jobs + progress (polling or WebSocket)
- Gallery with metadata and quick re-generate
- Tauri packaging for one-click desktop app


Let's start by:
1. Creating the project structure exactly as specified
2. Setting up a CLAUDE.md file to track our progress
3. Implementing the backend first with proper error handling
4. Creating comprehensive logging from the start
5. Adding educational comments explaining key concepts

Please think through the implementation approach first, particularly:
- How to handle the Pillow text composition elegantly
- Proper error boundaries for OpenAI API failures  
- Efficient file serving without security risks
- Clean separation of concerns in the codebase

Begin with the project setup and backend API structure.


----

Ensure to use Context7 to get the latest and up to date info about the libraries to use. And also, ensure to apply the subagents as needed. Elaborate or generate sub agents on the fly.