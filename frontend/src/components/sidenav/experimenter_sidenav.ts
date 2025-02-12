import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {FirebaseService} from '../../services/firebase.service';
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from '../../services/router.service';

import {APP_NAME} from '../../shared/constants';

import {styles} from './experimenter_sidenav.scss';

/** Sidenav menu component */
@customElement('experimenter-sidenav')
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly authService = core.getService(AuthService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (
      !this.authService.isExperimenter ||
      this.routerService.activePage === Pages.EXPERIMENT
    ) {
      return nothing;
    }

    const toggleNav = () => {
      this.routerService.setExperimenterNav(
        !this.routerService.isExperimenterNavOpen,
      );
    };

    const navClasses = classMap({
      'nav-wrapper': true,
      closed: !this.routerService.isExperimenterNavOpen,
    });

    const renderTitle = () => {
      if (this.routerService.isExperimenterNavOpen) {
        return html`<div class="title">${APP_NAME}</div>`;
      }
      return nothing;
    };

    return html`
      <div class=${navClasses}>
        <div class="top">
          <div class="menu-title" role="button" @click=${toggleNav}>
            <pr-icon class="icon" color="secondary" icon="menu"></pr-icon>
            ${renderTitle()}
          </div>
          ${NAV_ITEMS.filter(
            (navItem) => navItem.isExperimenterPage && navItem.isPrimaryPage,
          ).map((navItem) => this.renderNavItem(navItem))}
        </div>
        <div class="bottom">
          ${NAV_ITEMS.filter(
            (navItem) => navItem.isExperimenterPage && !navItem.isPrimaryPage,
          ).map((navItem) => this.renderNavItem(navItem))}
        </div>
      </div>
    `;
  }

  private renderNavItem(navItem: NavItem) {
    const navItemClasses = classMap({
      'nav-item': true,
      selected: this.routerService.activePage === navItem.page,
    });

    const handleNavItemClicked = (_e: Event) => {
      if (navItem.isParticipantPage) {
        const routeParams = this.routerService.activeRoute.params;
        const experimentId = routeParams['experiment'];
        const participantId = routeParams['participant'];

        this.routerService.navigate(navItem.page, {
          experiment: experimentId,
          participant: participantId,
        });
      } else {
        this.routerService.navigate(navItem.page);
      }
    };

    return html`
      <div class=${navItemClasses} role="button" @click=${handleNavItemClicked}>
        <pr-icon class="icon" icon=${navItem.icon}></pr-icon>
        ${this.routerService.isExperimenterNavOpen ? navItem.title : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-sidenav': SideNav;
  }
}
