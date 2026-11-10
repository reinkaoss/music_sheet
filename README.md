# Violin Sheet Reader

A single-page web app for learning violin note reading: practice quizzes on the staff, **Live** mode with microphone pitch detection, **Songs** (including Suzuki Volume 1 from the book), and **Stats** with session history.

Deploys to [Netlify](https://www.netlify.com/) from `main` (`reinkaoss/music_sheet`). The PWA works offline after the first load via the service worker.

## Local development

This repo is static HTML/CSS/JS — there is no bundler or build step.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (rewrites to `violin-reader.html`, same as production).

**Microphone and audio** require HTTPS or `localhost`. Use the dev server above; opening the HTML file directly (`file://`) will not work for Live mode or sound.

## Project layout

| File | Purpose |
|------|---------|
| `violin-reader.html` | Entire app (UI, styles, logic) |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (caches app shell + CDN deps) |
| `netlify.toml` | Netlify publish dir, `/` → `violin-reader.html`, SW headers |

## Deploy

Push to `main` on GitHub; Netlify auto-deploys from this folder. No `npm run build` required.
