import { Notice } from "obsidian";
import { TRACK_CONFIGS, TrackConfig } from "../../constants";
import { SyncStrategy, StrategyContext } from "./sync-strategy";

export class StandaloneStrategy implements SyncStrategy {
  constructor(private context: StrategyContext) {}

  async check(manual = false): Promise<boolean> {
    if (manual) new Notice("Checking for local plugin changes...");

    const pluginsToWatch = await this.context.getPluginsToWatch();
    let changesDetected = false;

    for (const pluginId of pluginsToWatch) {
      const plugin = this.context.app.plugins.manifests[pluginId];
      if (!plugin) continue;

      for (const config of TRACK_CONFIGS) {
        if (
          config.pathSuffix === "data.json" &&
          (!this.context.settings.syncDataFiles ||
            pluginId === this.context.manifest.id)
        ) {
          continue;
        }

        const changed = await this.checkFileChange(
          pluginId,
          plugin?.dir || "",
          config,
        );
        if (changed) changesDetected = true;
      }
    }

    return changesDetected;
  }

  private async checkFileChange(
    pluginId: string,
    pluginDir: string,
    config: TrackConfig,
  ): Promise<boolean> {
    const fullPath = `${pluginDir}/${config.pathSuffix}`;
    const cacheKey = `${pluginId}_${config.keySuffix}`;

    try {
      const stats = await this.context.app.vault.adapter.stat(fullPath);
      const lastModified = stats?.mtime || 0;
      const previousModified = this.context.lastModifiedMap.get(cacheKey) || 0;

      if (previousModified === 0) {
        this.context.lastModifiedMap.set(cacheKey, lastModified);
        return false;
      }

      if (lastModified > previousModified) {
        this.context.lastModifiedMap.set(cacheKey, lastModified);
        console.debug(
          `[Mobile Hot Reload] ${pluginId} ${config.pathSuffix} changed. Reloading...`,
        );

        if (!this.context.clientStats.plugins[pluginId]) {
          this.context.clientStats.plugins[pluginId] = {
            lastReload: null,
            filesFetched: 0,
          };
        }

        this.context.requestReload(pluginId);
        return true;
      }
    } catch {
      // File might not exist yet
    }
    return false;
  }
}
