# LoneLink

LoneLink is a lightweight local-network application for sharing files, images, text, links, and code snippets between devices connected to the same Wi-Fi or Ethernet network.

One computer runs the LoneLink server, and other computers, phones, or tablets access it through their web browser. Files remain on the host computer and are not uploaded to an external cloud service.

## Features

- Share files between devices on the same local network
- Share text, links, and code snippets
- Drag-and-drop multi-file uploads
- Upload progress and configurable file-size limits
- Paste clipboard images directly into LoneLink
- Download and delete shared files
- Pin important files and text items
- Optional password protection
- Automatic interface updates across connected devices
- Responsive desktop and mobile interface
- Pinterest-style Photo Mode
- Chrome, Edge, and Brave browser extension
- Right-edge image uploading from other websites
- Right-click **Send image to LoneLink** command
- Special image detection for websites such as Pinterest and X

## Requirements

- Node.js 18 or newer
- npm
- Devices connected to the same local network

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
```

Enter the project folder:

```bash
cd YOUR-REPOSITORY
```

Install the dependencies:

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Available settings include:

```env
PORT=3000
SHARE_PASSWORD=
MAX_UPLOAD_SIZE_MB=500
```

- `PORT` controls the LoneLink server port.
- `SHARE_PASSWORD` enables password protection when set.
- `MAX_UPLOAD_SIZE_MB` controls the maximum size of each uploaded file.

The `.env` file is excluded from Git and should not be committed.

## Running LoneLink

Start the server:

```bash
npm start
```

For development, you can also use:

```bash
npm run dev
```

LoneLink prints its available addresses in the terminal:

```text
Local:   http://localhost:3000
Network: http://192.168.x.x:3000
```

Open the network address on another device connected to the same Wi-Fi or Ethernet network.

You may need to allow Node.js through Windows Firewall when prompted.

## Using LoneLink

### Sharing files

Drag files into the upload area or select **Choose files**.

Uploaded files are stored locally in the `uploads` folder on the computer running LoneLink.

### Sharing text and links

Enter text, a URL, or a code snippet in the **Text & Links** section and select **Share**.

Text items are stored locally in `data/items.json`.

### Pinned items

Use the pin button to keep important files or text items in the Pinned Posts section.

Pins are saved in the browser's local storage, so different browsers or devices can have different pinned items.

## Photo Mode

Select **Photo Mode** in the top bar to display uploaded images in a responsive masonry gallery.

In Photo Mode, you can:

- Browse uploaded images
- Open images in a full-screen preview
- Download images
- Delete images
- Upload additional photos

## Chrome, Edge, and Brave extension

The companion browser extension is located in the `extension` folder.

### Installation

Open the extensions page:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Brave: `brave://extensions`

Then:

1. Enable **Developer mode**.
2. Select **Load unpacked**.
3. Select the project's `extension` folder.
4. Open the LoneLink extension settings.
5. Enter the network address printed by LoneLink, such as `http://192.168.2.8:3000`.
6. Use **Test connection** to confirm that the extension can reach LoneLink.

### Uploading from websites

Drag an image toward the right edge of the browser window. When the LoneLink panel appears, release the image to upload it.

The extension supports:

- Standard webpage images
- Responsive images using `srcset`
- CSS-backed images
- Blob images
- Images behind website overlays
- Pinterest and X image cards

If a website prevents normal dragging, right-click on or over the image and select **Send image to LoneLink**.

A green checkmark on the extension icon indicates success. A red exclamation mark indicates failure. Open the extension popup to see the latest upload result.

After updating the extension files, reload the extension from the browser's extensions page and refresh any existing website tabs.

## Local storage

LoneLink creates these folders automatically:

```text
uploads/
data/
```

They are excluded from Git so uploaded files and shared text are not committed to the repository.

The following local files are also excluded:

```text
node_modules/
.env
*.log
```

## Security notes

LoneLink is intended for trusted local networks.

- It uses ordinary HTTP by default.
- Traffic is not end-to-end encrypted.
- Anyone who can reach the server may access it unless `SHARE_PASSWORD` is configured.
- Do not expose the LoneLink port directly to the public internet.
