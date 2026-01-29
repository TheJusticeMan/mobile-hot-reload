import { around } from "monkey-around";
import { Component, Plugin } from "obsidian";

/**
 * Reload the settings tab (and scroll position) of a setting tab
 */
export class SettingReloader extends Component {
  constructor(public plugin: Plugin) {
    super();
  }

  app = this.plugin.app;
  left = 0;
  top = 0;
  lastTab: string = "";

  /**
   * Is the plugin's setting tab active and on-screen?  If so, save its scroll
   * position and set it up to refresh after load.
   */
  onPluginDisable(pluginID: string) {
    if (
      this.app.setting.activeTab?.id === pluginID &&
      this.app.setting.containerEl.isShown()
    ) {
      const { scrollTop: top, scrollLeft: left } =
        this.app.setting.activeTab.containerEl;
      this.lastTab = pluginID;
      this.left = left;
      this.top = top;
      // set up the hook to detect the setting tab registration (if not already set up)
      this.load();
    }
  }

  onload() {
    // we want to capture 'this' in the monkey patch
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.plugin.addChild(this); // ensure we unload when hot-reload does
    this.register(
      around(Plugin.prototype, {
        addSettingTab(next) {
          return function (this: Plugin, tab, ...args: unknown[]) {
            next.call(this, tab, ...args);
            if (self.lastTab && this.manifest.id === self.lastTab) {
              const { lastTab, left, top } = self;
              // only try this once per plugin id per disable
              self.lastTab = "";
              setTimeout(() => {
                if (
                  self.lastTab || // another state was saved
                  !this.app.setting.containerEl.isShown() || // settings not open
                  this.app.setting.activeTab // not on the previously-closed tab
                )
                  return;
                this.app.setting.openTabById(lastTab);
                tab.containerEl.scrollTo({ left, top });
              }, 100);
            }
          };
        },
      }),
    );
  }
}
