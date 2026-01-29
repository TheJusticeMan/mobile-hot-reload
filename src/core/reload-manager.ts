import { App, PluginManifest, Platform, Notice, debounce } from "obsidian";
import { MobileHotReloadSettings } from "../settings";
import { HotReloadServer } from "../server";
import { SyncStrategy, StrategyContext } from "./strategy/sync-strategy";
import { StandaloneStrategy } from "./strategy/standalone-strategy";
import { ClientStrategy } from "./strategy/client-strategy";
import { taskQueue } from "../utils/queue";
import { ClientStats } from "../types";

export class ReloadManager {
  private strategy: SyncStrategy;
  private intervalId: number | null = null;
  private server: HotReloadServer | null = null;
  private lastModifiedMap: Map<string, number> = new Map();
  private run = taskQueue();
  private pluginDirMap: Map<string, string> = new Map();
  private pluginReloaders: Record<string, ReturnType<typeof debounce>> = {};

  constructor(
    private app: App,
    private manifest: PluginManifest,
    private settings: MobileHotReloadSettings,
    private clientStats: ClientStats,
    private reloadPlugin: (pluginId: string) => Promise<void>,
  ) {}

  public reindex() {
    this.stop();

    // Start server if in server mode
    if (Platform.isDesktop && this.settings.mode === "server") {
      this.startServer();
    }

    // Initialize strategy
    const context: StrategyContext = {
      app: this.app,
      manifest: this.manifest,
      settings: this.settings,
      lastModifiedMap: this.lastModifiedMap,
      run: this.run,
      clientStats: this.clientStats,
      reloadPlugin: this.reloadPlugin,
      requestReload: (pluginId: string) => this.requestReload(pluginId),
      getPluginsToWatch: () => this.getPluginsToWatch(),
    };

    if (this.settings.mode === "client") {
      this.strategy = new ClientStrategy(context);
    } else {
      this.strategy = new StandaloneStrategy(context);
    }

    // Start polling
    this.intervalId = window.setInterval(() => {
      void this.strategy.check();
    }, this.settings.pollingInterval);
  }

  public async check(manual = false) {
    if (this.strategy) {
      const changed = await this.strategy.check(manual);
      if (manual && !changed) {
        new Notice("No changes detected.");
      }
    }
  }

  public requestReload(pluginId: string) {
    let reloader = this.pluginReloaders[pluginId];
    if (!reloader) {
      reloader = this.pluginReloaders[pluginId] = debounce(
        () => {
          void this.run(async () => {
            await this.reloadPlugin(pluginId);
            if (this.clientStats.plugins[pluginId]) {
              this.clientStats.plugins[pluginId].lastReload =
                new Date().toLocaleTimeString();
            }
          });
        },
        750,
        true,
      );
    }
    reloader();
  }

  public stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopServer();
    if (this.strategy?.destroy) {
      this.strategy.destroy();
    }
    for (const reloader of Object.values(this.pluginReloaders)) {
      if (typeof reloader.cancel === "function") {
        reloader.cancel();
      }
    }
    this.pluginReloaders = {};
  }

  private startServer() {
    if (!this.server) {
      this.server = new HotReloadServer(
        this.app,
        this.settings.serverPort,
        () => this.getPluginsToWatch(),
        () => this.settings.syncDataFiles,
      );
    }
    this.server.start();
  }

  private stopServer() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  public getServer() {
    return this.server;
  }

  private async getPluginsToWatch(): Promise<string[]> {
    const manifests = this.app.plugins.manifests;
    this.pluginDirMap.clear();

    for (const pluginId in manifests) {
      const manifest = manifests[pluginId];
      const dir = manifest?.dir || "";
      const dirName = dir.split("/").pop();
      if (dirName) {
        this.pluginDirMap.set(dirName, pluginId);
      }
    }

    if (!this.settings.autoDetect) {
      return this.settings.watchedPlugins;
    }

    const pluginsToWatch: string[] = [];
    for (const pluginId in manifests) {
      const manifest = manifests[pluginId];
      const dir = manifest?.dir || "";
      const hasGit = await this.app.vault.adapter.exists(`${dir}/.git`);
      const hasHotReload = await this.app.vault.adapter.exists(
        `${dir}/.hotreload`,
      );

      if (hasGit || hasHotReload) {
        pluginsToWatch.push(pluginId);
      }
    }
    return pluginsToWatch;
  }

  public getPluginIdFromDir(dir: string): string | undefined {
    return this.pluginDirMap.get(dir);
  }
}
