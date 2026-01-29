import { MobileHotReloadSettings } from "./settings";

/**
 * Statistics and state for the hot reload client.
 */
export interface ClientStats {
  lastSync: string | null;
  totalFilesFetched: number;
  status: "idle" | "syncing" | "error";
  plugins: Record<string, { lastReload: string | null; filesFetched: number }>;
}

export type { MobileHotReloadSettings };
