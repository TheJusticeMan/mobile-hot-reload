# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-01-28

### Added

- New setting to enable/disable the notification shown when a plugin is reloaded.

## [1.0.0] - 2026-01-28

### Added

- Initial release of Mobile Hot Reload.
- **Three Operation Modes**:
  - **Standalone**: Watches local files for changes.
  - **Server**: Watches local files and serves updates to mobile clients (Desktop only).
  - **Client**: Connects to a server to download and apply plugin updates.
- **Instant Hot Reload**: Automatically reloads plugins when `main.js`, `manifest.json`, `styles.css`, or `data.json` change.
- **Cross-Device Sync**: Synchronize development changes from desktop to mobile devices instantly.
- **Automatic Detection**: Automatically identifies plugins to watch if they contain a `.git` folder or a `.hotreload` file.
- **Data Sync**: Optional synchronization of `data.json` to keep plugin settings in sync across devices.
- **Desktop Optimizations**: Utilizes native file system watching on Desktop for near-instant detection.
- **Sourcemap Support**: Automatically enables plugin debugging during reload to ensure sourcemaps are preserved.
- **UI & Accessibility**:
  - Ribbon icon for quick manual change detection.
  - Comprehensive settings tab with real-time sync statistics.
  - Status indicators for server and client activity.
- **Customizable Settings**: Configure polling intervals, server ports, and manual watch lists.
- **Manual Trigger**: Command to manually check for plugin changes.
