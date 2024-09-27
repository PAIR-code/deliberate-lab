import {makeObservable} from 'mobx';
import {Service} from './service';
import {Pages, RouterService} from './router.service';

interface ServiceProvider {
  routerService: RouterService;
}

/** Manages Google Analytics. */
export class AnalyticsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  trackPageView(page: Pages) {
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', {
        page_title: page,
        page_location: this.sp.routerService.getRoutePath(page),
      });
    }
  }
}
