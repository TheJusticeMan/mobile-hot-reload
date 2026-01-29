/*
Original logic derived from obsidian-hot-reload by PJ Eby (ISC License).
*/
import { around } from "monkey-around";
import { App, requireApiVersion } from "obsidian";

/**
 * Prevents Obsidian from stripping source maps from the plugin's main.js file.
 * This is achieved by appending a comment that tricks the loader.
 *
 * @param app - The Obsidian App instance.
 * @param pluginId - The ID of the plugin being reloaded.
 * @returns An uninstall function to revert the patch.
 */
export function preventSourcemapStripping(app: App, pluginId: string) {
  if (requireApiVersion("1.6")) {
    return around(app.vault.adapter, {
      read(old) {
        return function (this: unknown, path: string) {
          // eslint-disable-next-line prefer-rest-params -- preserve arguments
          const res = old.apply(this, arguments as unknown as [string]);
          if (!path.endsWith(`/${pluginId}/main.js`)) return res;
          return res.then((txt) => txt + "\n/* nosourcemap */");
        };
      },
    });
  }
  return () => {};
}
