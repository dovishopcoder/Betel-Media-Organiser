# Run on Another Windows Computer

## Install Requirements

Install these first:

- Git for Windows: https://git-scm.com/download/win
- Node.js LTS or newer: https://nodejs.org/

## Clone the Project

Use this option when the computer has internet access and you want the latest
code from GitHub.

```powershell
cd "$env:USERPROFILE\Documents"
git clone https://github.com/dovishopcoder/Betel-Media-Organiser.git
cd "Betel-Media-Organiser"
```

## Portable ZIP Without GitHub

Use this option when you want to carry the app on a USB stick.

On the current computer:

```powershell
npm run package:portable
```

This creates a ZIP file in `portable/`. Copy that ZIP file to the church
computer, unzip it, then open PowerShell inside the unzipped folder.

## Install and Start

```powershell
npm install
npm run start:windows
```

Run `npm run db:init` only if you want to reset/create a fresh demo database.
If you copied the `data/` folder, do not run `db:init` unless you intentionally
want fresh seed data.

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
copy these folders from the old computer to the new one, or use the portable ZIP:

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
