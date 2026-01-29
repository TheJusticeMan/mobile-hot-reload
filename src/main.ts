/*
Original logic derived from obsidian-hot-reload by PJ Eby (ISC License).
*/
import { FileSystemAdapter, Notice, Platform, Plugin } from "obsidian";
import { SettingReloader } from "SettingReloader";
import { TRACKED_FILENAMES } from "./constants";
import { ReloadManager } from "./core/reload-manager";
import { DEFAULT_SETTINGS, MobileHotReloadSettings } from "./settings";
import { ClientStats } from "./types";
import { MobileHotReloadSettingTab } from "./ui/settings-tab";
import { isSymlink } from "./utils/isSymlink";
import { preventSourcemapStripping } from "./utils/sourcemaps";

/**
 * Main plugin class for Mobile Hot Reload.
 */
export default class MobileHotReload extends Plugin {
  /**
   * Current plugin settings.
   */
  settings: MobileHotReloadSettings;

  /**
   * Manages the reload logic and orchestration.
   */
  reloadManager: ReloadManager;

  settingReloader = new SettingReloader(this);
  /**
   * Statistics and state for the hot reload client.
   */
  clientStats: ClientStats = {
    lastSync: null as string | null,
    totalFilesFetched: 0,
    status: "idle" as "idle" | "syncing" | "error",
    plugins: {} as Record<
      string,
      { lastReload: string | null; filesFetched: number }
    >,
  };

  /**
   * Plugin loading lifecycle method.
   */
  async onload() {
    await this.loadSettings();

    this.reloadManager = new ReloadManager(
      this.app,
      this.manifest,
      this.settings,
      this.clientStats,
      (pluginId) => this.reloadPlugin(pluginId),
    );

    this.addSettingTab(new MobileHotReloadSettingTab(this.app, this));

    this.addRibbonIcon(
      "refresh-cw",
      "Hot reload: manual check",
      () => void this.reloadManager.check(true),
    );

    this.addCommand({
      id: "check-for-changes",
      name: "Check for plugin changes",
      callback: () => this.reloadManager.check(true),
    });

    this.app.workspace.onLayoutReady(async () => {
      void this.reindexPlugins();

      // Native watching (Desktop only)
      if (Platform.isDesktop) {
        this.registerEvent(this.app.vault.on("raw", this.onFileChange));
        void this.watch(this.app.plugins.getPluginFolder());
      }
    });
  }

  /**
   * Handler for raw file changes in the vault (Desktop only).
   */
  private onFileChange = (filename: string) => {
    const pluginFolder = this.app.plugins.getPluginFolder();
    if (!pluginFolder || !filename.startsWith(pluginFolder + "/")) return;

    const relativePath = filename.substring(pluginFolder.length + 1);
    const parts = relativePath.split("/");

    if (parts.length === 1) {
      // It's a directory in the plugins folder
      return void this.watch(filename);
    }

    if (parts.length !== 2) return;

    const [dir, base] = parts;
    if (!dir || !base) return;

    const pluginId = this.reloadManager.getPluginIdFromDir(dir);

    if (
      base === "manifest.json" ||
      base === ".hotreload" ||
      base === ".git" ||
      !pluginId
    ) {
      return void this.reindexPlugins();
    }

    if (!TRACKED_FILENAMES.includes(base)) return;

    void this.reloadManager.check();
  };

  /**
   * Starts watching a path for changes if needed (Desktop only).
   */
  async watch(path: string) {
    const { adapter } = this.app.vault;
    if (
      !(adapter instanceof FileSystemAdapter) ||
      Object.prototype.hasOwnProperty.call(adapter.watchers, path)
    )
      return;
    if ((await adapter.stat(path))?.type !== "folder") return;

    const watchNeeded = !Platform.isMacOS && !Platform.isWin;
    if (watchNeeded || isSymlink(adapter, path)) {
      await adapter.startWatchPath(path);
    }
  }

  /**
   * Plugin unloading lifecycle method.
   */
  onunload() {
    this.reloadManager.stop();
  }

  /**
   * Loads plugin settings from disk.
   */
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<MobileHotReloadSettings>,
    );
  }

  /**
   * Saves plugin settings to disk.
   */
  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Re-initializes the plugin watching and server.
   */
  async reindexPlugins() {
    await this.reloadManager.reindex();
  }

  /**
   * Disables and re-enables a plugin to trigger a hot reload.
   *
   * @param pluginId - The ID of the plugin to reload.
   */
  async reloadPlugin(pluginId: string) {
    const plugins = this.app.plugins;

    if (!plugins.enabledPlugins.has(pluginId)) return;

    this.settingReloader.onPluginDisable(pluginId);

    // Ensure sourcemaps are loaded (Obsidian 0.14+)
    const oldDebug = window.localStorage.getItem("debug-plugin");
    window.localStorage.setItem("debug-plugin", "1");
    const uninstall = preventSourcemapStripping(this.app, pluginId);

    try {
      await plugins.disablePlugin(pluginId);
      await plugins.enablePlugin(pluginId);
      if (this.settings.showReloadNotice) {
        new Notice(`Plugin "${pluginId}" reloaded`);
      }
    } catch (e) {
      console.error(
        `[Mobile Hot Reload] Failed to reload plugin ${pluginId}`,
        e,
      );
      new Notice(`Failed to reload plugin "${pluginId}"`);
    } finally {
      // Restore previous setting
      if (oldDebug === null) {
        window.localStorage.removeItem("debug-plugin");
      } else {
        window.localStorage.setItem("debug-plugin", oldDebug);
      }
      uninstall?.();
    }
  }
}
