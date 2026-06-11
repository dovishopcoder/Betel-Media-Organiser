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

Double click:

```text
1_CREAZA_PACHET_PENTRU_FLASH.bat
```

Or run manually:

```powershell
npm run package:portable
```

This creates a ZIP file in `portable/`. Copy that ZIP file to the church
computer, unzip it, then open PowerShell inside the unzipped folder.

## Install and Start

On the church computer, inside the unzipped folder:

1. Run `2_INSTALEAZA_PE_CALCULATORUL_BISERICII.bat` once.
2. Run `3_PORNESTE_BETEL_MEDIA.bat` whenever you want to start the app.

Manual commands:

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

Double click:

```text
4_DESCHIDE_ECRAN_SALA_FULLSCREEN.bat
```

Or run:

```powershell
npm run screen:main
```

Exit kiosk mode with `Alt + F4`.

For the stage screen:

```text
5_DESCHIDE_ECRAN_SCENA_FULLSCREEN.bat
```

## Update From the Internet

If the church computer already has the portable app installed, you can update
it from GitHub without copying a new USB package.

Double click:

```text
6_ACTUALIZEAZA_DIN_INTERNET.bat
```

The update keeps local church data:

- `data/`
- `media/`

It replaces the application files with the latest version from GitHub, runs
`npm install`, and starts the control panel again.

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
