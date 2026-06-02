# Betel Media Organiser

Local media control center for Betel church services.

## MVP

- `/control` - operator panel for program items, songs, slides, and live controls.
- `/main-screen` - fullscreen audience output.
- `/stage-screen` - fullscreen confidence monitor with current slide, next slide, time, and notes.
- SQLite database in `data/betel-media.db`.
- Live synchronization through Socket.io.

## Run Locally

```bash
npm install
npm run db:init
npm run dev
```

Open:

- `http://localhost:3000/control`
- `http://localhost:3000/main-screen`
- `http://localhost:3000/stage-screen`

Media files can be stored in `media/`. The local database is ignored by Git.
