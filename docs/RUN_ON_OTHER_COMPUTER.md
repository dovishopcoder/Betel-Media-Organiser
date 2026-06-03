# Run on Another Windows Computer

## Install Requirements

Install these first:

- Git for Windows: https://git-scm.com/download/win
- Node.js LTS or newer: https://nodejs.org/

## Clone the Project

```powershell
cd "$env:USERPROFILE\Documents"
git clone https://github.com/dovishopcoder/Betel-Media-Organiser.git
cd "Betel-Media-Organiser"
```

## Install and Start

```powershell
npm install
npm run db:init
npm run start:windows
```

Open manually if needed:

- `http://localhost:3000/control`
- `http://localhost:3000/main-screen`
- `http://localhost:3000/stage-screen`

## Launch the HDMI Audience Screen

```powershell
npm run screen:main
```

Exit kiosk mode with `Alt + F4`.

## Move Existing Local Data

The app stores church data locally. To move the same setup to another computer,
copy these folders from the old computer to the new one:

- `data/`
- `media/`

`data/` contains the SQLite database. `media/` contains backgrounds and future
uploaded files.

## Important

`localhost` works only on the computer where the server is running. If the page
does not load after a restart, run:

```powershell
npm run start:windows
```
