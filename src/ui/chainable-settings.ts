import { SettingGroup } from "obsidian";

/**
 * A chainable extension of the `SettingGroup` class that provides utility methods
 * for fluent configuration of setting groups in the UI.
 *
 * @remarks
 * This class introduces methods that allow for more expressive and conditional
 * addition of settings, as well as utility methods for manipulating the group.
 *
 * @example
 * ```typescript
 * new ChainableSettingGroup()
 *   .then(group => {
 *     // Conditionally add settings
 *     return group;
 *   })
 *   .empty();
 * ```
 */
export class ChainableSettingGroup extends SettingGroup {
  /**
   * Executes a callback with this group and returns this group.
   * Useful for conditional setting additions.
   */
  then(callback: (group: this) => this): this {
    return callback(this);
  }

  /**
   * Removes all child elements from the parent element of the current setting button.
   *
   * @returns The current instance for method chaining.
   */
  empty(): this {
    this.addSetting((btn) => btn.settingEl.parentElement?.empty());
    return this;
  }
}
