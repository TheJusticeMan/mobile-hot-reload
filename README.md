# Mobile Hot Reload

Hot reload Obsidian plugins on mobile and desktop by watching for file changes. This plugin includes a built-in server and client to bridge the gap between your desktop development environment and mobile testing devices.

## Features

- **Instant Hot Reload**: Automatically reloads plugins when `main.js`, `manifest.json`, `styles.css`, or `data.json` change.
- **Cross-Device Sync**: Develop on desktop and see changes instantly on your phone or tablet.
- **Three Operation Modes**:
  - **Standalone**: Watches local files for changes (ideal for desktop-only dev).
  - **Server**: (Desktop only) Watches local files and serves updates to mobile clients.
  - **Client**: (Mobile/Desktop) Connects to a server to download and apply plugin updates.
- **Automatic Detection**: Automatically identifies plugins to watch if they contain a `.git` folder or a `.hotreload` file.
- **Data Sync**: Optionally synchronize `data.json` to keep plugin settings in sync across devices.

## Getting Started

### 1. Installation

1. Install the plugin via the Obsidian community plugin browser or manually.
2. Enable the plugin in **Settings → Community plugins**.

### 2. Configure Your Mode

- **Desktop Development**: Set mode to **Server** in the plugin settings.
- **Mobile Testing**: Set mode to **Client** and enter your desktop's IP address and the configured port (default: 8080).

### 3. Mark Plugins for Watching

By default, the plugin automatically watches any plugin in your vault that:

- Contains a `.git` directory.
- OR contains an empty file named `.hotreload`.

You can also manually specify plugins to watch in the settings tab.

## Settings

- **Mode**: Choose between Standalone, Server, or Client.
- **Polling Interval**: How often to check for changes (default: 2000ms).
- **Auto-Detect**: Automatically watch plugins with development markers.
- **Sync Data Files**: Enable to synchronize `data.json` changes.
- **Server Port**: The port the server listens on (default: 8080).
- **Remote URL**: The address of the server (e.g., `http://192.168.1.5:8080`).

## Commands

- **Check for plugin changes**: Manually trigger a check across all watched plugins.

## Development

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the build in watch mode.

## Manual Installation

- Copy `main.js`, `manifest.json`, and `styles.css` (if present) to your vault's plugin folder: `<Vault>/.obsidian/plugins/mobile-hot-reload/`.

## Credits

This plugin incorporates logic and ideas from [obsidian-hot-reload](https://github.com/pjeby/hot-reload) by **PJ Eby**, licensed under the ISC License.

---

Created by [Justice Vellacott](https://github.com/TheJusticeMan)
