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

## Configuration

Environment variables can be configured in a .env file at the root of the project. Refer to .env.example for available options such as port settings and discovery intervals.

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
