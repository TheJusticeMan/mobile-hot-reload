import { Platform } from "obsidian";
import type { FileSystemAdapter } from "obsidian";

/**
 * Utility to check if a path within the vault is a symbolic link.
 *
 * This implementation uses Node's `fs.lstatSync` and is designed for desktop
 * environments. In environments where this check is unavailable or fails,
 * it conservatively returns `true` to ensure hot-reloading remains active.
 */
export function isSymlink(
  adapter: FileSystemAdapter,
  path: string,
): boolean {
  if (!Platform.isDesktop) return true;

  try {
    const { lstatSync } = require("fs") as typeof import("fs");
    const realPath = [adapter.basePath, path].join("/");
    const lstat = lstatSync(realPath, { throwIfNoEntry: false });
    return !!(lstat && lstat.isSymbolicLink());
  } catch {
    /** Fallback for non-Node environments. */
    return true;
  }
}
