# lonelink

Lonelink is a lightweight application designed for local area network (LAN) data sharing and synchronization. It facilitates seamless communication and file transfer between devices connected to the same local network.

## Features

- LAN Discovery: Automatically detects other devices running lonelink on the same network.
- Secure Sharing: Peer-to-peer data transfer without the need for external cloud servers.
- Cross-Platform Support: Designed to work across different operating systems within a local network environment.
- Low Latency: Optimized for high-speed transfers using local bandwidth.

## Getting Started

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   git clone https://github.com

2. Navigate to the project directory:
   cd lonelink

3. Install dependencies:
   npm install

### Running the Application

To start the development server:

npm run dev

The application will typically be accessible at http://localhost:3000. Ensure other devices on your LAN can reach your local IP address on the specified port.

## Usage

1. Open the application on two or more devices connected to the same Wi-Fi or Ethernet network.
2. The interface will display available peers discovered on the network.
3. Select a peer to initiate a connection or share data.

## Photo Mode

Select **Photo Mode** in the top bar to view every uploaded image in a responsive
masonry gallery. Select an image for a full-screen preview, or use the controls
on its tile to download or delete it.

## Chrome / Edge / Brave right-edge uploader

The companion unpacked extension is in the `extension` folder.

1. Open the extensions page for your browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the project's `extension` folder.
4. Open the extension's settings and enter the LoneLink LAN address printed in
   the terminal, for example `http://192.168.2.8:3000`.
5. Drag an image on any website toward the right edge. Drop it on the blue
   LoneLink panel to upload it.

On sites with custom image dragging, including Pinterest and X, the extension
looks beneath overlays and resolves responsive, embedded, and CSS-backed image
sources. You can also right-click on or over an image and choose
**Send image to LoneLink**. A green check or red exclamation mark on the
extension icon reports the result; open the popup for the detailed last status.

Local image files can also be dragged from File Explorer into the edge panel.
If LoneLink password protection is enabled, open LoneLink and log in before
using the extension.

After updating the extension files, select **Reload** on the browser's
extensions page and refresh any website tabs that were already open.

## Configuration

Environment variables can be configured in a .env file at the root of the project. Refer to .env.example for available options such as port settings and discovery intervals.

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
