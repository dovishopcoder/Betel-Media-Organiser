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

## Launch Screens

For the audience HDMI screen, use kiosk mode so the room does not see browser chrome:

```bash
npm run screen:main
```

For the stage screen on the primary monitor:

```bash
npm run screen:stage
```

Exit kiosk mode with `Alt + F4`.

## Main Screen Background

The audience screen uses the configured background only when the output is
blank/idle. During songs or other live content, the slide is shown cleanly
without that background image.

Set the idle background from `/control` in the `Fundal repaus` panel. Uploaded
images are stored locally in `media/backgrounds/` and are ignored by Git.

Media files can be stored in `media/`. The local database is ignored by Git.
