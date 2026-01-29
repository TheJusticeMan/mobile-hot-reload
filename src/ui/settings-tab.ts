import { App, Component, PluginSettingTab } from "obsidian";
import MobileHotReload from "../main";
import { ChainableSettingGroup } from "./chainable-settings";

/**
 * The settings tab for Mobile Hot Reload.
 */
export class MobileHotReloadSettingTab extends PluginSettingTab {
  plugin: MobileHotReload;
  icon: string = "refresh-cw";
  statusGroupStateComponent: Component = new Component();

  constructor(app: App, plugin: MobileHotReload) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Renders the settings tab UI.
   */
  display(): void {
    this.plugin.removeChild(this.statusGroupStateComponent);
    this.plugin.addChild(this.statusGroupStateComponent);
    const { containerEl } = this;
    containerEl.empty();

    new ChainableSettingGroup(containerEl)
      .addSetting(
        (setting) =>
          void setting
            .setName("Operation mode")
            .setDesc(
              "Standalone: watch local files. Server: serve files to other devices. Client: fetch files from a server.",
            )
            .addDropdown((dropdown) =>
              dropdown
                .addOption("standalone", "Standalone")
                .addOption("server", "Server (desktop only)")
                .addOption("client", "Client")
                .setValue(this.plugin.settings.mode)
                .onChange(async (value: "standalone" | "server" | "client") => {
                  this.plugin.settings.mode = value;
                  await this.plugin.saveSettings();
                  await this.plugin.reindexPlugins();
                  this.display();
                }),
            ),
      )
      .then((group) => {
        void (
          this.plugin.settings.mode === "server" &&
          group.addSetting(
            (setting) =>
              void setting
                .setName("Server port")
                .setDesc("Port to run the server on.")
                .addText((text) =>
                  text
                    .setPlaceholder("8080")
                    .setValue(this.plugin.settings.serverPort.toString())
                    .onChange(async (value) => {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.serverPort = numValue;
                        await this.plugin.saveSettings();
                        await this.plugin.reindexPlugins();
                      }
                    }),
                ),
          )
        );
        void (
          this.plugin.settings.mode === "client" &&
          group.addSetting(
            (setting) =>
              void setting
                .setName("Remote server URL")
                .setDesc("The URL of the desktop hot-reload server.")
                .addText((text) =>
                  text
                    .setPlaceholder("http://192.168.1.5:8080")
                    .setValue(this.plugin.settings.remoteUrl)
                    .onChange(async (value) => {
                      this.plugin.settings.remoteUrl = value;
                      await this.plugin.saveSettings();
                      await this.plugin.reindexPlugins();
                    }),
                ),
          )
        );
        return group;
      })
      .addSetting(
        (setting) =>
          void setting
            .setName("Auto-detect plugins")
            .setDesc(
              `Automatically watch plugins that contain a ${".git"} or ${".hotreload"} file.`,
            )
            .addToggle((toggle) =>
              toggle
                .setValue(this.plugin.settings.autoDetect)
                .onChange(async (value) => {
                  this.plugin.settings.autoDetect = value;
                  await this.plugin.saveSettings();
                  await this.plugin.reindexPlugins();
                  this.display();
                }),
            ),
      )
      .addSetting(
        (setting) =>
          void setting
            .setName("Sync data files")
            .setDesc("Sync data.json files for plugins.")
            .addToggle((toggle) =>
              toggle
                .setValue(this.plugin.settings.syncDataFiles)
                .onChange(async (value) => {
                  this.plugin.settings.syncDataFiles = value;
                  await this.plugin.saveSettings();
                  await this.plugin.reindexPlugins();
                }),
            ),
      )
      .addSetting(
        (setting) =>
          void setting
            .setName("Show reload notice")
            .setDesc("Show a notice when a plugin is successfully reloaded.")
            .addToggle((toggle) =>
              toggle
                .setValue(this.plugin.settings.showReloadNotice)
                .onChange(async (value) => {
                  this.plugin.settings.showReloadNotice = value;
                  await this.plugin.saveSettings();
                }),
            ),
      )
      .then((group) => {
        void (
          !this.plugin.settings.autoDetect &&
          group.addSetting(
            (setting) =>
              void setting
                .setName("Watched plugins")
                .setDesc(
                  "Comma-separated list of plugin ids to watch for changes.",
                )
                .addText((text) =>
                  text
                    .setPlaceholder(`${"plugin-id-1"}, ${"plugin-id-2"}`)
                    .setValue(this.plugin.settings.watchedPlugins.join(", "))
                    .onChange(async (value) => {
                      this.plugin.settings.watchedPlugins = value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      await this.plugin.saveSettings();
                      await this.plugin.reindexPlugins();
                    }),
                ),
          )
        );
        return group;
      })
      .addSetting(
        (setting) =>
          void setting
            .setName("Polling interval")
            .setDesc("How often to check for changes (in milliseconds).")
            .addText((text) =>
              text
                .setPlaceholder("2000")
                .setValue(this.plugin.settings.pollingInterval.toString())
                .onChange(async (value) => {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue > 0) {
                    this.plugin.settings.pollingInterval = numValue;
                    await this.plugin.saveSettings();
                    await this.plugin.reindexPlugins();
                  }
                }),
            ),
      );

    this.renderStatus(containerEl);
  }

  private renderStatus(containerEl: HTMLElement): void {
    const statusGroup = new ChainableSettingGroup(containerEl);

    this.updateStatusBasedOnMode(statusGroup, containerEl);
    this.statusGroupStateComponent.registerInterval(
      window.setInterval(
        () => this.updateStatusBasedOnMode(statusGroup, containerEl),
        1000,
      ),
    );
  }

  updateStatusBasedOnMode = (
    statusGroup: ChainableSettingGroup,
    containerEl: HTMLElement,
  ) => {
    const { scrollTop: top, scrollLeft: left } = containerEl;
    statusGroup.empty();
    if (this.plugin.settings.mode === "server") {
      this.renderServerStatus(statusGroup);
    }
    if (
      this.plugin.settings.mode === "client" ||
      this.plugin.settings.mode === "standalone"
    ) {
      this.renderClientStatus(statusGroup);
    }
    containerEl.scrollTo(left, top);
  };

  private renderServerStatus(statusGroup: ChainableSettingGroup): void {
    statusGroup.setHeading("Server Statistics");
    const server = this.plugin.reloadManager?.getServer();
    const stats = server?.stats;
    const isRunning = server?.isRunning();
    statusGroup.addSetting(
      (setting) =>
        void setting
          .setName("Server status")
          .setDesc(isRunning ? "🟢 Running" : "🔴 Stopped")
          .addButton((btn) =>
            btn
              .setButtonText("Refresh stats")
              .onClick(() =>
                this.updateStatusBasedOnMode(statusGroup, this.containerEl),
              ),
          ),
    );

    if (stats) {
      statusGroup.addSetting(
        (setting) =>
          void setting
            .setName("Requests")
            .setDesc(
              `Total: ${stats.requestCount} | Errors: ${stats.errorCount}`,
            ),
      );
      if (stats.lastRequest) {
        statusGroup.addSetting(
          (setting) =>
            void setting
              .setName("Last activity")
              .setDesc(stats.lastRequest || ""),
        );
      }
    }
  }

  private renderClientStatus(statusGroup: ChainableSettingGroup): void {
    statusGroup.setHeading("Sync Statistics");
    const cStats = this.plugin.clientStats;
    statusGroup.addSetting(
      (setting) =>
        void setting
          .setName("Client status")
          .setDesc(
            `State: ${cStats.status} | Last sync: ${cStats.lastSync || "never"}`,
          )
          .addButton((btn) =>
            btn
              .setButtonText("Refresh stats")
              .onClick(() =>
                this.updateStatusBasedOnMode(statusGroup, this.containerEl),
              ),
          ),
    );

    if (this.plugin.settings.mode === "client") {
      statusGroup.addSetting(
        (setting) =>
          void setting
            .setName("Files fetched")
            .setDesc(
              `${cStats.totalFilesFetched} total files downloaded from server`,
            ),
      );
    }

    const pluginIds = Object.keys(cStats.plugins);
    if (pluginIds.length > 0) {
      statusGroup.addSetting(
        (setting) => void setting.setDesc("Plugin activity"),
      );
      pluginIds.forEach((id) => {
        const p = cStats.plugins[id];
        if (!p) return;
        statusGroup.addSetting(
          (setting) =>
            void setting
              .setName(id)
              .setDesc(
                `Last reload: ${p.lastReload || "never"}${this.plugin.settings.mode === "client" ? ` | Files synced: ${p.filesFetched}` : ""}`,
              ),
        );
      });
    }
  }
  hide(): void {
    this.plugin.removeChild(this.statusGroupStateComponent);
  }
}
