/**
 * @license
 * Copyright 2020 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  LitElement,
  CSSResult,
  TemplateResult,
  html,
  property,
  css,
  unsafeCSS,
  customElement,
} from 'lit-element';

import { FluidTab } from '../tab/tab';
import {
  FluidTabActivatedEvent,
  FluidTabDisabledEvent,
  FluidTabGroupActiveTabChanged,
  FluidTabBlurredEvent,
} from '../tab-events';
import {
  ENTER,
  SPACE,
  ARROW_RIGHT,
  ARROW_LEFT,
  TAB,
} from '@dynatrace/shared/keycodes';

import {
  FLUID_SPACING_SMALL,
  FLUID_SPACING_0,
  FLUID_SPACING_MEDIUM,
} from '@dynatrace/fluid-design-tokens';

/**
 * This is a experimental version of the tab group component
 * It registers itself as `fluid-tab-group` custom element.
 * @element fluid-tab-group
 * @slot - Default slot lets the user provide a group of fluid-tabs.
 */
@customElement('fluid-tab-group')
export class FluidTabGroup extends LitElement {
  /** Array of referrences to the fluid-tabs */
  private tabChildren: FluidTab[];

  /** Styles for the tab list component */
  static get styles(): CSSResult {
    return css`
      :host {
        /**
        * Legibility definitions should probably be
        * shipped or imported from a core
        */
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }

      .fluid-tab-group {
        margin-block-start: ${unsafeCSS(FLUID_SPACING_SMALL)};
        margin-block-end: ${unsafeCSS(FLUID_SPACING_SMALL)};
        margin-inline-start: ${unsafeCSS(FLUID_SPACING_0)};
        margin-inline-end: ${unsafeCSS(FLUID_SPACING_0)};
        padding-inline-start: ${unsafeCSS(FLUID_SPACING_MEDIUM)};
      }
    `;
  }

  /**
   * Defines the currently active tab id
   * @attr
   * @type string
   */
  @property({ type: String, reflect: true })
  activeTabId: string;

  /** Sets the active tab on click */
  private handleClick(event: FluidTabActivatedEvent): void {
    const toActivateTab = this.tabChildren.find(
      (tabItem) => tabItem.tabid === event.tabId,
    );

    if (toActivateTab) {
      // Resets the tabindexes
      const toResetTab = this.tabChildren.find((tab) => tab.active);
      if (toResetTab) {
        toResetTab.tabindex = -1;
        toResetTab.active = false;
        toResetTab.tabbed = false;
      }
      this.activeTabId = event.tabId;

      toActivateTab.active = true;
      toActivateTab.tabindex = 0;
      this.dispatchEvent(new FluidTabGroupActiveTabChanged(event.tabId));
    }
  }

  /** Sets the active tab on keydown (ArrowLeft and ArrowRight to select / Enter and Space to confirm) */
  private handleKeyUp(event: KeyboardEvent): void {
    // Sets the focus outline when user tabbed into the tab group
    if (event.code === TAB) {
      const focusableTab = this.tabChildren.find((tab) => tab.tabindex === 0);

      if (focusableTab) {
        focusableTab.tabbed = true;
      }
    }

    // Selection control. Selects the tab that was previously focused using tab/arrowkeys
    if (event.code === ENTER || event.code === SPACE) {
      const toBeActivatedTab = this.tabChildren.find(
        (tab) => tab.tabindex === 0,
      );

      if (toBeActivatedTab) {
        const toDeactivateTab = this.tabChildren.find((tab) => tab.active);
        if (toDeactivateTab) {
          toDeactivateTab.active = false;
        }

        toBeActivatedTab.active = true;
        this.activeTabId = toBeActivatedTab.tabid;
        this.dispatchEvent(new FluidTabGroupActiveTabChanged(this.activeTabId));
      }
    }
    // Arrow control (navigate tabs)
    if (event.code === ARROW_RIGHT || event.code === ARROW_LEFT) {
      let index = this.tabChildren.findIndex(
        (tab: FluidTab) => tab.tabindex === 0,
      );
      const oldIndex = index;
      if (event.code === ARROW_RIGHT) {
        index += 1;
      }
      if (event.code === ARROW_LEFT) {
        index -= 1;
      }
      if (index > this.tabChildren.length - 1) {
        index = 0;
      } else if (index < 0) {
        index = this.tabChildren.length - 1;
      }

      this.tabChildren[index].tabbed = true;
      this.tabChildren[oldIndex].tabbed = false;
      this.tabChildren[index].focus();
    }
  }

  /** Event handler for key down events. Prevention of default scroll behavior on the SPACE key */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === SPACE) {
      event.preventDefault();
    }
  }

  /** Checks whether the next tab is also disabled or not and sets the next available tab as active  */
  private handleDisabled(disableTabEvent: FluidTabDisabledEvent): void {
    if (this.activeTabId === disableTabEvent.tabId) {
      this.setFirstEnabledTabActive();
    }
  }

  /** Handles changes in the slot. Initially sets the active item (default is first) */
  private slotchange(): void {
    this.tabChildren = Array.from(this.querySelectorAll('fluid-tab'));
    // Set all tabindexes to -1 because the default is 0
    for (const tab of this.tabChildren) {
      tab.tabindex = -1;
    }
    // Set a tab to active
    const activeTab = this.tabChildren.find((tab) => tab.active);
    if (activeTab) {
      activeTab.tabindex = 0;
      this.activeTabId = activeTab.tabid;
    } else {
      this.setFirstEnabledTabActive();
    }
  }

  /** Resets the tabindex if the user lost focus without activating the selected tab */
  private handleBlur(event: FluidTabBlurredEvent): void {
    // Sets the selected but not activated tabs tabindex to -1
    const toDisableTabIndexTab = this.tabChildren.find(
      (tab) => tab.tabid === event.tabId,
    );
    if (toDisableTabIndexTab) {
      toDisableTabIndexTab.tabindex = -1;
    }
    // Sets the active tabs tabindex to 0
    const toEnableTabIndexTab = this.tabChildren.find((tab) => tab.active);
    if (toEnableTabIndexTab) {
      toEnableTabIndexTab.tabindex = 0;
    }
  }

  /**
   * Render function of the custom element. It is called when one of the
   * observedProperties (annotated with @property) changes.
   */
  render(): TemplateResult {
    return html`
      <div
        class="fluid-tab-group"
        @tabActivated="${this.handleClick}"
        @blurred="${this.handleBlur}"
        @keyup="${this.handleKeyUp}"
        @keydown="${this.handleKeyDown}"
        @disabled="${this.handleDisabled}"
      >
        <slot @slotchange="${this.slotchange}"></slot>
      </div>
    `;
  }

  /** Sets an available tab to active. (Not disabled) */
  setFirstEnabledTabActive(): void {
    const tabToEnable = this.tabChildren.find((tab) => !tab.disabled);
    if (tabToEnable) {
      tabToEnable.active = true;
      this.activeTabId = tabToEnable.tabid;
    }
  }
}
