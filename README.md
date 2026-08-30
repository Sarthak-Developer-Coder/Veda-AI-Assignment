# VedaAI

VedaAI is a full-stack teacher tool for extracting numbered questions from question papers and reviewing uploaded answer sheets.

## Current flow

1. The browser uploads a question paper and answer sheet to the Express API.
2. The backend extracts PDF text with `pdfjs-dist` and image text with `Tesseract.js`.
3. Numbered questions and labelled subparts are returned as structured JSON in printed order.
4. Detected answer headings are matched to canonical question IDs.
5. When configured, Gemini performs answer mapping and grading on the server.
6. The existing React UI renders the returned question list and feedback states.

## Architecture

- `backend/server.js`: upload validation, PDF/image extraction, question parsing, orchestration, and API response.
- `backend/ai.js`: isolated server-side Gemini mapping and grading adapter.
- `src/routes/index.tsx`: upload state and API integration.
- `src/components/veda/`: existing upload, question list, processing, and answer review UI.
- `src/lib/veda-data.ts`: shared runtime types only; no assessment fixtures.

## Setup

```bash
npm install
npm run dev
```

The Vite client runs on `http://localhost:5173` and the API runs on `http://localhost:3001`.

## Environment variables

Create a `.env` file for optional AI grading:

```env
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-2.5-flash
```

Never expose `GEMINI_API_KEY` through Vite or browser code. Without the key, local OCR and explicit number-based answer detection still run, but AI grading is reported as unavailable rather than simulated.

## API

`POST /api/process` accepts multipart fields:

- `questionPaper`: one PDF or supported image
- `answerSheet`: one PDF or supported image

The response contains `assessment.questions`, `assessment.summary`, and extracted source text. Files are limited to 20 MB and supported image extensions are PNG, JPEG, WebP, BMP, and GIF.

`GET /api/health` returns the backend health status.

## Production

```bash
npm run build
npm run server
```

Deploy the Node process with the server environment variables configured. Serve the Vite output through the deployment platform and proxy `/api` requests to the Express process.

### Render API

The included `render.yaml` creates the Node/Express web service. Set `GEMINI_API_KEY` in the Render dashboard and use the generated service URL as the frontend API base.

### Vercel frontend

Import the repository into Vercel. The included `vercel.json` builds the client output. Add this environment variable in Vercel, pointing to the Render service without a trailing slash:

```env
VITE_API_URL=https://your-render-service.onrender.com
```

Vercel and Render deployments cannot be performed from this workspace without access to the deployment accounts; these files make the two deployments reproducible.

## Known limitations

- Tesseract.js is local OCR and may be inaccurate on low-resolution handwriting or unusual scripts.
- Gemini mapping and grading require `GEMINI_API_KEY`; no fake grading is produced without it.
- The current answer viewer still needs a document-image rendering layer to display uploaded page pixels and OCR bounding boxes; extracted regions are not fabricated.
- Mark values default to one when the source question does not expose a parseable mark value.

## Assumptions

- Question labels are printed at the beginning of a line, such as `9(a)` or `11(b)`.
- PDF text extraction is preferred for digital PDFs; scanned PDFs require image OCR support.
- Teachers review low-confidence OCR and AI results before using grades.

## Validation

```bash
npm run build
npm run lint
```
