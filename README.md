# UniTranslate

UniTranslate is a lightweight web app (Flask + vanilla JS) that translates text using **DeepL**. It includes a PWA/offline screen, speech-to-text, text-to-speech, OCR (Tesseract.js), history, and favorites.

### Live preview
https://unitranslate-v2-e7685a48df3a.herokuapp.com

---

## Features

- Text translation via DeepL
- Auto-translate while typing (toggleable)
- Manual translate + retry on failure
- Source/target language selection + swap
- Tone / formality support (neutral, formal, casual)
- Copy, share, and save favorites
- Recent translation history (localStorage)
- Speech-to-text (Web Speech API)
- Text-to-speech (Speech Synthesis API)
- OCR from image/camera (Tesseract.js)
- PWA basics:
  - `manifest.json`
  - `sw.js` service worker
  - `/offline` page

---

## Tech stack

- **Backend:** Python, Flask
- **Production server:** Gunicorn (see `Procfile`)
- **Frontend:** HTML/CSS/JS in `templates/` and `static/`
- **OCR:** Tesseract.js (loaded from CDN)
- **PWA:** service worker (`static/js/sw.js`)
- **Deployment target:** Heroku-style (Procfile + runtime)

---

## Setup (local development)

### 1) Install dependencies

```bash
pip install -r requirements.txt
```

### 2) Configure environment variables

Create a file named `.env` in the project root:

```bash
DEEPL_API_KEY=your_deepl_key_here
```

> Do not commit your `.env` to git.

### 3) Run the app

Local dev (Flask):

```bash
python app.py
```

The server listens on `PORT` (default `5000`).

---

## Production run (Gunicorn)

This project is set up for Gunicorn using the `Procfile`:

- `Procfile`: `web: gunicorn app:app`
- `runtime.txt`: `python-3.10`

On Heroku (or similar platforms) the platform will use the `Procfile` automatically.

---

## API details

Backend endpoint:

- `POST /translate`

Expected JSON body (from the frontend):

- `text` (string, required)
- `target_lang` (string, required; e.g. `ES`, `FR`)
- `source_lang` (string, optional; auto-detect if omitted)
- `tone` (string, optional: `neutral | formal | casual`)

Response:

- `200`: `{ "translation": "..." }`
- `400`: `{ "error": "Missing text or target language" }`
- `500`: `{ "error": "..." }`

---

## Offline / PWA notes

- Live translation requires an internet connection.
- When offline, UniTranslate can show cached UI and the offline screen at `/offline`.
- The service worker is served at root scope via the Flask route `/sw.js`.

---

## Troubleshooting

### DeepL API errors
- Ensure `DEEPL_API_KEY` is set in `.env`.
- If translations fail, check DeepL account status/permissions.

### OCR / Speech recognition not working
- OCR requires browser features and the Tesseract script to load.
- Speech recognition availability depends on the browser (Web Speech API support varies).

### Service worker / offline caching
- If offline behavior is inconsistent, hard refresh the page (bypass cache) and try again.

---
## Feel free to edit, fork and contribute to this Project
