/**
 * Settings for the Mobile Hot Reload plugin.
 */
export interface MobileHotReloadSettings {
  /**
   * List of plugin IDs to watch manually when auto-detect is disabled.
   */
  watchedPlugins: string[];
  /**
   * Interval in milliseconds between checks for changes.
   */
  pollingInterval: number;
  /**
   * Whether to automatically detect plugins to watch based on .git or .hotreload files.
   */
  autoDetect: boolean;
  /**
   * Whether to synchronize data.json files as well.
   */
  syncDataFiles: boolean;
  /**
   * The operation mode of the plugin.
   * - standalone: Watches local files.
   * - server: Serves plugin files to other devices (desktop only).
   * - client: Fetches plugin files from a remote server.
   */
  mode: "standalone" | "server" | "client";
  /**
   * Port for the hot reload server (when in server mode).
   */
  serverPort: number;
  /**
   * URL of the remote hot reload server (when in client mode).
   */
  remoteUrl: string;
  /**
   * Whether to show a notice when a plugin is reloaded.
   */
  showReloadNotice: boolean;
}

/**
 * Default settings for the plugin.
 */
export const DEFAULT_SETTINGS: MobileHotReloadSettings = {
  watchedPlugins: [],
  pollingInterval: 2000,
  autoDetect: true,
  syncDataFiles: false,
  mode: "standalone",
  serverPort: 8080,
  remoteUrl: "http://localhost:8080",
  showReloadNotice: true,
};
