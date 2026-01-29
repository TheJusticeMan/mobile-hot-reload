// eslint-disable-next-line import/no-nodejs-modules -- This is needed for the symlink check
import { lstatSync } from "fs";
import { FileSystemAdapter } from "obsidian";

/**
 * Utility to check if a path within the vault is a symbolic link.
 *
 * This implementation uses Node's `fs.lstatSync` and is designed for desktop
 * environments. In environments where this check is unavailable or fails,
 * it conservatively returns `true` to ensure hot-reloading remains active.
 */
export const isSymlink = (() => {
  try {
    /**
     * @param adapter - The Obsidian FileSystemAdapter instance.
     * @param path - The vault-relative path to check.
     * @returns `true` if the path is a symbolic link; `false` otherwise.
     */
    return (adapter: FileSystemAdapter, path: string): boolean => {
      const realPath = [adapter.basePath, path].join("/");
      const lstat = lstatSync(realPath, { throwIfNoEntry: false });
      return !!(lstat && lstat.isSymbolicLink());
    };
  } catch {
    /** Fallback for non-Node environments. */
    return () => true;
  }
})();
