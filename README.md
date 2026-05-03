# LAN Share

A tiny self-hosted web app for sharing **files, photos, and text/links** between devices
on the same Wi-Fi / LAN. You run it on one computer, and any phone, tablet, or laptop
on the same network opens it in a browser using your computer's local IP.

- ✅ Drag-and-drop file upload (images, PDFs, zips, anything)
- ✅ Paste-and-share text, URLs, code snippets — with one-tap **copy to clipboard**
- ✅ Download / delete buttons on every item
- ✅ Optional password protection
- ✅ 100% local — no cloud, no external database, just an `uploads/` folder and a JSON file
- ✅ Works on Windows, macOS, and Linux. Mobile-friendly UI.

---

## Project structure

```
lan-share/
├── package.json
├── server.js              # Express server with all API endpoints
├── .env.example           # Copy to .env to configure password / port / upload size
├── .gitignore
├── README.md
├── public/                # Frontend (served by Express)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── views/
│   └── login.html         # Shown only when SHARE_PASSWORD is set
├── uploads/               # Created automatically on first run
└── data/
    └── items.json         # Created automatically — stores text/link items
```

---

## Requirements

- **Node.js 18 or newer** (download from https://nodejs.org if you don't have it)
- A computer and other devices on the **same Wi-Fi / LAN**

---

## Quick start

Open a terminal in the project folder and run:

```bash
npm install
npm start
```

When the server starts you'll see something like:

```
=========================================
  LAN Share is running
=========================================
  Local:    http://localhost:3000
  Network:  http://192.168.1.50:3000   <-- open this on your phone
-----------------------------------------
  Password: disabled (set SHARE_PASSWORD in .env)
  Max file: 500 MB
  Uploads:  C:\Users\you\lan-share\uploads
=========================================
  Press Ctrl+C to stop.
```

Open the **Network** URL on any device connected to the same Wi-Fi — that's it.

---

## Configuration (optional)

Copy `.env.example` to `.env` and edit any value you want:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

| Variable             | Default | Purpose                                       |
|----------------------|---------|-----------------------------------------------|
| `SHARE_PASSWORD`     | *(empty)* | If set, requires login before any access     |
| `PORT`               | `3000`  | Port the server listens on                    |
| `MAX_UPLOAD_SIZE_MB` | `500`   | Maximum size per uploaded file, in megabytes  |

After changing `.env`, restart the server (`Ctrl+C`, then `npm start`).

---

## API endpoints

All endpoints require auth when `SHARE_PASSWORD` is set (cookie-based).

| Method | Path                       | Purpose                                          |
|--------|----------------------------|--------------------------------------------------|
| GET    | `/api/items`               | List all files + text items, plus config         |
| POST   | `/api/text`                | Add a text/link item — body: `{ "content": "…" }` |
| DELETE | `/api/text/:id`            | Delete a text/link item by id                    |
| POST   | `/api/upload`              | Upload one or more files (multipart `files[]`)   |
| GET    | `/files/:filename`         | Download a file                                  |
| DELETE | `/api/files/:filename`     | Delete a file                                    |

**Path-traversal protection:** all filename inputs are reduced to their basename
and re-resolved inside the `uploads/` directory before any read or delete.

---

## How to find your LAN IP on Windows

The server prints it for you in the startup banner, but if you ever need to find it manually:

**Option A — Command Prompt or PowerShell:**

```
ipconfig
```

Look under **"Wireless LAN adapter Wi-Fi"** (or **"Ethernet adapter"**) for the line:

```
IPv4 Address . . . . . . . . . . . : 192.168.1.50
```

That's your LAN IP. Use `http://192.168.1.50:3000` (substitute your actual address).

**Option B — Quick PowerShell one-liner:**

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Dhcp' } | Select-Object IPAddress
```

> On macOS: `ipconfig getifaddr en0` (Wi-Fi) or `ipconfig getifaddr en1`
> On Linux: `hostname -I` or `ip addr show`

---

## How to open it from another phone or PC

1. Make sure the other device is on the **same Wi-Fi network** as the host computer.
2. In the device's browser, type the **Network URL** the server printed, e.g.:
   ```
   http://192.168.1.50:3000
   ```
3. Bookmark it on your phone for one-tap access.

If the page won't load on another device, it's almost always the firewall — see below.

---

## Windows Firewall note

The first time you run `npm start`, Windows may show a popup:

> **"Windows Defender Firewall has blocked some features of this app"**
> *Allow Node.js to communicate on Private networks*

**Tick "Private networks"** and click **Allow access**. That's all you need.

If you missed the popup, or other devices still can't connect:

1. Open **Windows Security** → **Firewall & network protection** → **Allow an app through firewall**
2. Click **Change settings**, then **Allow another app…**
3. Browse to your Node.js executable, typically:
   `C:\Program Files\nodejs\node.exe`
4. Make sure **Private** is checked (you can leave Public unchecked).
5. Save and try again from your phone.

If you'd rather poke a single port hole, run **PowerShell as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "LAN Share 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

To remove it later:

```powershell
Remove-NetFirewallRule -DisplayName "LAN Share 3000"
```

---

## Security notes

- This app is **for trusted local networks only.** It runs over plain HTTP and stores files
  unencrypted on disk.
- The optional `SHARE_PASSWORD` is a basic gate — useful on a shared apartment Wi-Fi, but
  not a substitute for real authentication.
- Don't expose the port to the public internet (don't port-forward 3000 on your router).
- Path-traversal attempts on filenames are rejected by the server.
- Uploads are size-limited via `MAX_UPLOAD_SIZE_MB`.

---

## Troubleshooting

**Other devices can't reach `http://192.168.x.x:3000`:**
1. Confirm they're on the same Wi-Fi as the host — guest networks often isolate clients.
2. Check the Windows Firewall section above.
3. Try `http://localhost:3000` on the host first to confirm the server is up.
4. Some routers have "AP isolation" enabled — disable it in router settings.

**`Error: listen EADDRINUSE: address already in use :::3000`:**
Port 3000 is taken by another app. Set a different port in `.env`:
```
PORT=3050
```

**Node version too old:**
Run `node -v`. If it's below `v18`, update from https://nodejs.org.

**Uploads stop at the limit:**
Increase `MAX_UPLOAD_SIZE_MB` in `.env` and restart.

---

## How to run locally on LAN

The fast version, end to end:

1. Install Node.js 18+ from https://nodejs.org.
2. In this folder, run:
   ```bash
   npm install
   npm start
   ```
3. The terminal prints something like `Network: http://192.168.1.50:3000` —
   copy that URL.
4. On the host machine, allow Node through Windows Firewall on **Private networks**
   (the popup, or the steps in the *Windows Firewall note* section).
5. On any phone or laptop on the same Wi-Fi, open that URL in a browser.
6. (Optional) Set `SHARE_PASSWORD=something` in `.env` and restart for a basic login.

You now have a private, no-cloud, drag-and-drop sharing page for your home network.
Stop the server any time with **Ctrl+C**.
