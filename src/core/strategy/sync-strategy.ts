import { App, PluginManifest } from "obsidian";
import { MobileHotReloadSettings } from "../../settings";
import { ClientStats } from "../../types";

/**
 * Interface for hot reload strategies.
 */
export interface SyncStrategy {
  /**
   * Checks for changes and triggers reloads if necessary.
   * @param manual Whether this was triggered manually.
   * @returns True if any changes were detected.
   */
  check(manual?: boolean): Promise<boolean>;

  /**
   * Cleanup method called when the strategy is no longer needed.
   */
  destroy?(): void;
}

/**
 * Common context for all strategies.
 */
export interface StrategyContext {
  app: App;
  manifest: PluginManifest;
  settings: MobileHotReloadSettings;
  lastModifiedMap: Map<string, number>;
  run: <T>(action: () => T | PromiseLike<T>) => Promise<T>;
  clientStats: ClientStats;
  reloadPlugin: (pluginId: string) => Promise<void>;
  requestReload: (pluginId: string) => void;
  getPluginsToWatch: () => Promise<string[]>;
}
