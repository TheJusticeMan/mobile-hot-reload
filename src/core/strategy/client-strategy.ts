import { Notice, requestUrl } from "obsidian";
import { TRACK_CONFIGS } from "../../constants";
import { SyncStrategy, StrategyContext } from "./sync-strategy";

export class ClientStrategy implements SyncStrategy {
  constructor(private context: StrategyContext) {}

  async check(manual = false): Promise<boolean> {
    if (manual) new Notice("Checking for remote plugin changes...");
    this.context.clientStats.status = "syncing";

    let pluginsToWatch: string[] = [];
    let remoteMtimes: Record<string, Record<string, number>> = {};

    try {
      const response = await requestUrl({
        url: `${this.context.settings.remoteUrl}/watched-plugins`,
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.status === 200) {
        remoteMtimes = response.json as Record<string, Record<string, number>>;
        pluginsToWatch = Object.keys(remoteMtimes);
      }
    } catch (e) {
      if (manual) new Notice("Failed to fetch watched plugins from server.");
      console.error("[Mobile Hot Reload] Failed to fetch watched plugins:", e);
      this.context.clientStats.status = "error";
      return false;
    }

    let changesDetected = false;
    for (const pluginId of pluginsToWatch) {
      const pluginDir = `${this.context.app.vault.configDir}/plugins/${pluginId}`;
      const changed = await this.checkRemoteChange(
        pluginId,
        pluginDir,
        remoteMtimes[pluginId],
      );
      if (changed) changesDetected = true;
    }

    this.context.clientStats.status = "idle";
    this.context.clientStats.lastSync = new Date().toLocaleTimeString();
    return changesDetected;
  }

  private async checkRemoteChange(
    pluginId: string,
    pluginDir: string,
    mtimes?: Record<string, number>,
  ): Promise<boolean> {
    let changed = false;

    if (!this.context.clientStats.plugins[pluginId]) {
      this.context.clientStats.plugins[pluginId] = {
        lastReload: null,
        filesFetched: 0,
      };
    }

    if (!(await this.context.app.vault.adapter.exists(pluginDir))) {
      await this.context.app.vault.adapter.mkdir(pluginDir);
    }

    for (const config of TRACK_CONFIGS) {
      if (
        config.pathSuffix === "data.json" &&
        (!this.context.settings.syncDataFiles ||
          pluginId === this.context.manifest.id)
      ) {
        continue;
      }

      const cacheKey = `remote_${pluginId}_${config.keySuffix}`;
      const previousModified = this.context.lastModifiedMap.get(cacheKey) || 0;

      if (mtimes) {
        const serverModified = mtimes[config.pathSuffix];
        if (
          serverModified !== undefined &&
          serverModified <= previousModified &&
          previousModified !== 0
        ) {
          continue;
        }
      }

      const url = `${this.context.settings.remoteUrl}/${pluginId}/${config.pathSuffix}`;

      try {
        const response = await requestUrl({
          url,
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        });

        if (response.status === 200) {
          const lastModifiedStr = response.headers["last-modified"];
          const lastModified = lastModifiedStr
            ? new Date(lastModifiedStr).getTime()
            : 0;

          const isInitialCheck = previousModified === 0;

          if (lastModified > previousModified || isInitialCheck) {
            this.context.lastModifiedMap.set(cacheKey, lastModified);

            const filePath = `${pluginDir}/${config.pathSuffix}`;
            await this.context.app.vault.adapter.writeBinary(
              filePath,
              response.arrayBuffer,
            );

            this.context.clientStats.totalFilesFetched++;
            this.context.clientStats.plugins[pluginId].filesFetched++;

            if (!isInitialCheck || pluginId !== this.context.manifest.id) {
              changed = true;
            }
          }
        }
      } catch {
        // Server might be down or file doesn't exist
      }
    }

    if (changed) {
      this.context.requestReload(pluginId);
    }

    return changed;
  }
}
