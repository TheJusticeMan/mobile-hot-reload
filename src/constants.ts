/**
 * Configuration defining which plugin files are tracked and how their
 * modification times are cached.
 */
export interface TrackConfig {
  /**
   * The relative path of the file within the plugin's directory.
   * e.g., "manifest.json", "main.js"
   */
  pathSuffix: string;
  /**
   * A unique key suffix used to identify this file in the `lastModifiedMap`.
   */
  keySuffix: string;
}

/**
 * The standard set of plugin files tracked by Mobile Hot Reload.
 */
export const TRACK_CONFIGS: TrackConfig[] = [
  {
    pathSuffix: "manifest.json",
    keySuffix: "manifest",
  },
  {
    pathSuffix: "main.js",
    keySuffix: "main",
  },
  {
    pathSuffix: "styles.css",
    keySuffix: "styles",
  },
  {
    pathSuffix: "data.json",
    keySuffix: "data",
  },
];

/**
 * A convenience list of filenames being tracked, derived from `TRACK_CONFIGS`.
 */
export const TRACKED_FILENAMES = TRACK_CONFIGS.map((c) => c.pathSuffix);
