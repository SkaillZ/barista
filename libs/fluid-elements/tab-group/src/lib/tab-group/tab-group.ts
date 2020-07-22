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

  /** Contains the tab id that is focus using ARROWKEYS and will be activated when the user presses SPACEBAR */
  private _toBeActiveTab: string;

  /** Sets the active tab on click */
  private handleClick(event: FluidTabActivatedEvent): void {
    const toActivateTab = this.tabChildren.find(
      (tabItem) => tabItem.tabid === event.activeTab,
    );

    // Only continue when the clicked tab is different from the currently active tab
    if (toActivateTab && this.activeTabId !== event.activeTab) {
      // Resets the tabindexes
      for (const tabItem of this.tabChildren) {
        tabItem.tabindex = -1;
        tabItem.active = false;
        tabItem.tabbed = false;
      }
      this.activeTabId = event.activeTab;
      this._toBeActiveTab = event.activeTab;

      toActivateTab.active = true;
      toActivateTab.tabindex = 0;
      this.dispatchEvent(new FluidTabGroupActiveTabChanged(this.activeTabId));
    }
  }

  /** Sets the active tab on keydown (ArrowLeft and ArrowRight to select / Enter and Space to confirm) */
  private handleKeyUp(event: KeyboardEvent): void {
    // Sets the focus outline when user tabbed into the tab group
    if (event.code === TAB) {
      const tabbed = this.tabChildren.find((tab) => {
        return tab.tabindex === 0;
      });

      if (tabbed) {
        tabbed!.tabbed = true;
      }
    }
    // Selection control. Selects the tab that was previously focused using tab/arrowkeys
    if (event.code === ENTER || event.code === SPACE) {
      // Find the tab to be activated
      const activeTab = this.tabChildren.find((tab) => {
        return this._toBeActiveTab === tab.tabid;
      })!;

      if (activeTab) {
        for (const tabItem of this.tabChildren) {
          tabItem.active = false;
        }

        activeTab.active = true;
        this.activeTabId = activeTab.tabid;
        this.dispatchEvent(new FluidTabGroupActiveTabChanged(this.activeTabId));
      }
    }
    // Arrow control (navigate tabs)
    if (event.code === ARROW_RIGHT || event.code === ARROW_LEFT) {
      let index = this.tabChildren.findIndex(
        (tab: FluidTab) => this._toBeActiveTab === tab.tabid,
      );
      console.log(index, 'prev');
      const oldIndex = index;
      // Arrow control checks what the next tab is and jump to the
      // first/last when navigating back from the first and forth from the last tab.
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
      console.log(index);
      // Adds a class that activates the outline when focused
      this.tabChildren[index].tabbed = true;
      this.tabChildren[index].focus();
      this._toBeActiveTab = this.tabChildren[index].tabid;
      // Set the old tab to normal state
      this.tabChildren[oldIndex].tabbed = false;
    }
  }

  /** Event handler for key down events */
  private handleKeyDown(event: KeyboardEvent): void {
    // In order to prevent the browser to scroll when the user selects a tab using the spacebar
    // we prevent the default behavior.
    if (event.code === SPACE) {
      event.preventDefault();
    }
  }

  /** Checks whether the next tab is also disabled or not and sets the next available tab as active  */
  private handleDisabled(disableTabEvent: FluidTabDisabledEvent): void {
    if (this.activeTabId === disableTabEvent.disableTab) {
      this.setFirstEnabledTabActive();
    }
  }

  /** Handles changes in the slot. Initially sets the active item (default is first) */
  private slotchange(): void {
    // Contains the length of the tabChildren to check if the user has removed tabs
    let tabChildrenLength;
    if (this.tabChildren !== undefined) {
      tabChildrenLength = this.tabChildren.length;
    }
    this.tabChildren = Array.from(this.querySelectorAll('fluid-tab'));
    // Check if one of the tabs is focusable and if the user removed tabs from the tabs array if non are focusable
    // If so we set the first available (not disabled) tab active
    if (
      !this.tabChildren.find((tab) => tab.tabindex === 0) &&
      tabChildrenLength > this.tabChildren.length
    ) {
      this.setFirstEnabledTabActive();
    }

    const toActivateTab = this.tabChildren.find(
      (tabItem) => tabItem.tabid === this.activeTabId,
    );
    // Set the first tab to active initially
    if (!toActivateTab && !this.activeTabId && this.tabChildren.length > 0) {
      // Setting active also sets the tabindex to `0`
      this.setFirstEnabledTabActive();
      // Set initially for arrow controls
      this._toBeActiveTab = this.activeTabId;
    } else {
      this._toBeActiveTab = this.activeTabId;
      for (const tab of this.tabChildren) {
        tab.active = tab.tabid === this.activeTabId;
      }
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
        @keyup="${this.handleKeyUp}"
        @keydown="${this.handleKeyDown}"
        @disabled="${this.handleDisabled}"
      >
        <slot @slotchange="${this.slotchange}"></slot>
      </div>
    `;
  }

  /** Sets an available tab to active. Not disabled */
  setFirstEnabledTabActive(): void {
    const tabToEnable = this.tabChildren.find((tab) => !tab.disabled);
    if (tabToEnable) {
      tabToEnable.active = true;
      this.activeTabId = tabToEnable.tabid;
    }
  }
}
