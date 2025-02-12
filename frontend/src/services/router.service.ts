import * as router5 from 'router5';
import browserPlugin from 'router5-plugin-browser';
import {computed, makeObservable, observable} from 'mobx';
import {Service} from './service';
import {AnalyticsService} from './analytics.service';
import {ExperimentManager} from './experiment.manager';
import {ExperimentService} from './experiment.service';
import {ParticipantService} from './participant.service';

interface ServiceProvider {
  analyticsService: AnalyticsService;
  experimentManager: ExperimentManager;
  experimentService: ExperimentService;
  participantService: ParticipantService;
}

/**
 * Handles app routing and page navigation
 */
export class RouterService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    this.router = router5.createRouter(this.routes, {
      defaultRoute: Pages.HOME,
      // defaultParams,
      queryParams: {booleanFormat: 'empty-true', nullFormat: 'hidden'},
      queryParamsMode: 'loose',
    });
  }

  protected readonly routes: router5.Route[] = [
    {
      name: Pages.HOME,
      path: '/',
    },
    {
      name: Pages.ADMIN,
      path: '/admin',
    },
    {
      name: Pages.SETTINGS,
      path: '/settings',
    },
    {
      name: Pages.EXPERIMENT,
      path: '/e/:experiment',
    },
    {
      name: Pages.EXPERIMENT_CREATE,
      path: '/new_experiment',
    },
    {
      name: Pages.PARTICIPANT,
      path: '/e/:experiment/p/:participant',
    },
    {
      name: Pages.PARTICIPANT_JOIN_COHORT,
      path: '/e/:experiment/c/:cohort',
    },
    {
      // Deprecated (but included for backwards compatibility):
      // Use PARTICIPANT page instead
      name: Pages.PARTICIPANT_STAGE,
      path: '/e/:experiment/p/:participant/:stage',
    },
  ];

  private readonly router: router5.Router;

  @observable.ref activeRoute: Route = {name: '', params: {}, path: ''};
  @observable isHandlingRouteChange = false;
  @observable hasNavigated = false; // True if navigated at least once in app

  @observable isExperimenterNavOpen = false;
  @observable isExperimenterPanelOpen = false;

  private getPage(route: Route): Pages | undefined {
    if (!route) return undefined;
    return route.name as Pages;
  }

  @computed
  get activePage(): Pages | undefined {
    return this.getPage(this.activeRoute);
  }

  @computed
  get isParticipantPage() {
    return this.activeRoute.params['participant'] !== undefined;
  }

  override initialize() {
    this.router.usePlugin(browserPlugin({useHash: true}));
    this.router.subscribe((routeChange: RouteChange) => {
      this.handlerRouteChange(routeChange);
    });
    this.router.start();
  }

  private handlerRouteChange(routeChange: RouteChange) {
    this.activeRoute = routeChange.route;
    if (this.activePage) {
      this.sp.analyticsService.trackPageView(
        this.activePage,
        this.activeRoute.path,
      );
    }
    this.loadDataForRoute();
  }

  private loadDataForRoute() {
    const params = this.activeRoute.params;

    if (params['experiment'] && params['participant']) {
      this.sp.participantService.updateForRoute(
        params['experiment'],
        params['participant'],
        params['stage'], // if defined, this sets current stage viewed
      );
      this.sp.experimentManager.updateForRoute(params['experiment']);
      this.sp.experimentService.updateForRoute(params['experiment']);
    } else if (params['experiment']) {
      this.sp.experimentManager.updateForRoute(params['experiment']);
      this.sp.experimentService.updateForRoute(params['experiment']);
      this.sp.participantService.reset();
    } else {
      this.sp.experimentManager.reset();
      this.sp.experimentService.reset();
      this.sp.participantService.reset();
    }
  }

  setExperimenterNav(isOpen: boolean) {
    this.isExperimenterNavOpen = isOpen;
  }

  setExperimenterPanel(isOpen: boolean) {
    this.isExperimenterPanelOpen = isOpen;
  }

  navigate(page: Pages, params: {[key: string]: string} = {}) {
    this.hasNavigated = true;
    this.sp.experimentManager.setIsEditing(false);
    return this.router.navigate(page, {...params});
  }

  navigateToDefault() {
    this.router.navigateToDefault();
  }

  getActiveRoute() {
    if (this.activeRoute) return this.activeRoute;
    return this.router.getState();
  }

  getActiveRouteParams() {
    return this.activeRoute.params;
  }

  getRoutePath(page: Pages) {
    const routeItem = this.routes.find((item) => item.name === page);
    if (!routeItem) return;
    return routeItem.path;
  }
}

/**
 * Type for onRouteChange callback subscription.
 */
export type Route = router5.State;

/**
 * Type for onRouteChange callback subscription.
 */
export type RouteChange = router5.SubscribeState;

/**
 * Enumeration of different pages.
 */
export enum Pages {
  ADMIN = 'ADMIN',
  HOME = 'HOME',
  EXPERIMENT = 'EXPERIMENT',
  EXPERIMENT_CREATE = 'EXPERIMENT_CREATE',
  PARTICIPANT = 'PARTICIPANT',
  PARTICIPANT_JOIN_COHORT = 'PARTICIPANT_JOIN_COHORT',
  // Deprecated (but included for backwards compatibility):
  // Use PARTICIPANT page instead
  PARTICIPANT_STAGE = 'PARTICIPANT_STAGE',
  SETTINGS = 'SETTINGS',
}

/**
 * Metadata for top-level navigation pages.
 */
export interface NavItem {
  page: Pages;
  title: string;
  icon: string;
  isExperimenterPage: boolean;
  isParticipantPage: boolean;
  isPrimaryPage: boolean;
}

/**
 * Top-level navigation items.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    page: Pages.HOME,
    title: 'Home',
    icon: 'home',
    isExperimenterPage: true,
    isParticipantPage: false,
    isPrimaryPage: true,
  },
  {
    page: Pages.EXPERIMENT_CREATE,
    title: 'New experiment',
    icon: 'science',
    isExperimenterPage: true,
    isParticipantPage: false,
    isPrimaryPage: true,
  },
  {
    page: Pages.SETTINGS,
    title: 'Settings',
    icon: 'settings',
    isExperimenterPage: true,
    isParticipantPage: false,
    isPrimaryPage: false,
  },
];
