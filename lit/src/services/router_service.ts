import * as router5 from "router5";
import browserPlugin from "router5-plugin-browser";
import { computed, makeObservable, observable } from "mobx";
import { Service } from "./service";

/**
 * Handles app routing and page navigation
 */
export class RouterService extends Service {
  constructor() {
    super();
    makeObservable(this);

    this.router = router5.createRouter(this.routes, {
      defaultRoute: Pages.HOME,
      // defaultParams,
      queryParams: { booleanFormat: "empty-true", nullFormat: "hidden" },
      queryParamsMode: "loose",
    });
  }

  protected readonly routes: router5.Route[] = [
    {
      name: Pages.HOME,
      path: "/",
    },
    {
      name: Pages.SETTINGS,
      path: "/settings",
    },
    {
      name: Pages.EXPERIMENT,
      path: "/:experiment",
    },
    {
      name: Pages.EXPERIMENT_CREATE,
      path: "/new_experiment",
    },
    {
      name: Pages.EXPERIMENT_STAGE,
      path: "/:experiment/:stage",
    }
  ];

  private readonly router: router5.Router;

  @observable.ref activeRoute: Route = { name: "", params: {}, path: "" };
  @observable isHandlingRouteChange = false;
  @observable hasNavigated = false; // True if navigated at least once in app

  // Used to display subnav for current experiment
  @observable sidenavExperimentId: string|null = null;

  setSidenavExperiment(id: string|null) {
    this.sidenavExperimentId = id;
  }

  private getPage(route: Route): Pages | undefined {
    if (!route) return undefined;
    return route.name as Pages;
  }

  @computed
  get activePage(): Pages | undefined {
    return this.getPage(this.activeRoute);
  }

  override initialize() {
    this.router.usePlugin(browserPlugin({ useHash: true }));
    this.router.subscribe((routeChange: RouteChange) => {
      this.handlerRouteChange(routeChange);
    });
    this.router.start();
  }

  private handlerRouteChange(routeChange: RouteChange) {
    this.activeRoute = routeChange.route;
  }

  navigate(page: Pages, params: { [key: string]: string } = {}) {
    this.hasNavigated = true;
    return this.router.navigate(page, { ...params });
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
  HOME = "HOME",
  SETTINGS = "SETTINGS",
  EXPERIMENT = "EXPERIMENT",
  EXPERIMENT_CREATE = "EXPERIMENT_CREATE",
  EXPERIMENT_STAGE = "EXPERIMENT_STAGE",
}

/**
 * Metadata for top-level navigation pages.
 */
export interface NavItem {
  page: Pages;
  title: string;
  icon: string;
  showInSidenav: boolean;
  isPrimaryPage: boolean;
}

/**
 * Top-level navigation items.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    page: Pages.HOME,
    title: "Home",
    icon: "home",
    showInSidenav: true,
    isPrimaryPage: true,
  },
  {
    page: Pages.SETTINGS,
    title: "Settings",
    icon: "settings",
    showInSidenav: true,
    isPrimaryPage: false,
  },
];
