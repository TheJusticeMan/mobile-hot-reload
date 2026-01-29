/* eslint-disable import/no-nodejs-modules */
import { Buffer } from "buffer";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import { App, normalizePath } from "obsidian";
import { TRACKED_FILENAMES } from "./constants";

/**
 * An HTTP server that provides plugin files to other devices (clients)
 * for synchronized hot-reloading.
 */
export class HotReloadServer {
  private server: Server | null = null;
  private app: App;
  private port: number;
  private getWatchedPlugins: () => Promise<string[]>;
  private shouldSyncDataFiles: () => boolean;

  /**
   * Real-time statistics tracking server activity and health.
   */
  public stats = {
    requestCount: 0,
    errorCount: 0,
    lastRequest: null as string | null,
    startTime: null as number | null,
  };

  constructor(
    app: App,
    port: number,
    getWatchedPlugins: () => Promise<string[]>,
    shouldSyncDataFiles: () => boolean,
  ) {
    this.app = app;
    this.port = port;
    this.getWatchedPlugins = getWatchedPlugins;
    this.shouldSyncDataFiles = shouldSyncDataFiles;
  }

  /**
   * Initializes and starts the HTTP server.
   * Resets statistics upon starting.
   */
  async start(): Promise<void> {
    this.stop();
    this.stats.startTime = Date.now();
    this.stats.requestCount = 0;
    this.stats.errorCount = 0;

    this.server = createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    this.server.listen(this.port, () => {
      console.debug(`[Hot Reload Server] Started on port ${this.port}`);
    });

    this.server.on("error", (e) => {
      this.stats.errorCount++;
      console.error("[Hot Reload Server] Server error:", e);
    });
  }

  /**
   * Central request dispatcher. Sets CORS headers and routes requests.
   *
   * @param req - Incoming HTTP request.
   * @param res - Outgoing HTTP response.
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    this.stats.requestCount++;
    this.stats.lastRequest = `${req.method} ${
      req.url
    } at ${new Date().toLocaleTimeString()}`;

    // Apply CORS to all responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "", `http://localhost:${this.port}`);

    if (url.pathname === "/watched-plugins") {
      return this.handleWatchedPluginsRequest(res);
    }

    return this.handleFileRequest(url.pathname, res);
  }

  /**
   * Responds with a JSON object containing the IDs of all watched plugins
   * and the last modified times of their tracked files.
   *
   * @param res - Outgoing HTTP response.
   */
  private async handleWatchedPluginsRequest(
    res: ServerResponse,
  ): Promise<void> {
    const watchedPlugins = await this.getWatchedPlugins();
    const response: Record<string, Record<string, number>> = {};

    for (const pluginId of watchedPlugins) {
      const manifest = this.app.plugins.manifests[pluginId];
      if (!manifest || !manifest.dir) continue;

      response[pluginId] = {};
      for (const filename of TRACKED_FILENAMES) {
        if (filename === "data.json" && !this.shouldSyncDataFiles()) {
          continue;
        }

        const filePath = normalizePath(`${manifest.dir}/${filename}`);
        try {
          const stats = await this.app.vault.adapter.stat(filePath);
          if (stats) {
            // Round to nearest second for consistency with HTTP Last-Modified
            response[pluginId][filename] =
              Math.floor(stats.mtime / 1000) * 1000;
          }
        } catch {
          /* File likely does not exist */
        }
      }
    }

    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify(response));
  }

  /**
   * Serves a specific plugin file.
   * Validates access based on plugin ID and filename.
   *
   * @param pathname - The URL path containing plugin ID and filename.
   * @param res - Outgoing HTTP response.
   */
  private async handleFileRequest(
    pathname: string,
    res: ServerResponse,
  ): Promise<void> {
    const parts = pathname.split("/").filter(Boolean);

    // Expected format: /[plugin-id]/[filename]
    if (parts.length < 2) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const [pluginId, filename] = parts;
    if (!pluginId || !filename) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    // Security: Only serve plugins that are actually being watched
    const watchedPlugins = await this.getWatchedPlugins();
    if (!watchedPlugins.includes(pluginId)) {
      res.writeHead(403);
      res.end("Plugin not watched");
      return;
    }

    // Security: Only serve allowed filenames
    const isAllowedFile =
      TRACKED_FILENAMES.includes(filename) &&
      (filename !== "data.json" || this.shouldSyncDataFiles());

    if (!isAllowedFile) {
      res.writeHead(403);
      res.end("Access denied");
      return;
    }

    const manifest = this.app.plugins.manifests[pluginId];
    if (!manifest || !manifest.dir) {
      res.writeHead(404);
      res.end("Plugin manifest or directory not found");
      return;
    }

    const filePath = normalizePath(`${manifest.dir}/${filename}`);

    try {
      const { adapter } = this.app.vault;
      if (await adapter.exists(filePath)) {
        const content = await adapter.readBinary(filePath);
        const stats = await adapter.stat(filePath);

        if (stats) {
          res.setHeader("last-modified", new Date(stats.mtime).toUTCString());
        }

        const contentType = filename.endsWith(".js")
          ? "application/javascript"
          : filename.endsWith(".css")
            ? "text/css"
            : "application/json";

        res.setHeader("Content-Type", contentType);
        res.writeHead(200);
        res.end(Buffer.from(content));
        return;
      }
    } catch (e) {
      this.stats.errorCount++;
      console.error(`[Hot Reload Server] Error serving ${filePath}:`, e);
    }

    res.writeHead(404);
    res.end("File not found");
  }

  /**
   * Checks if the server is currently listening for connections.
   *
   * @returns `true` if the server is running.
   */
  isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  /**
   * Gracefully shuts down the HTTP server.
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.debug("[Hot Reload Server] Stopped");
    }
  }
}
