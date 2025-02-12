import {observable} from 'mobx';

import {AnalyticsService} from './analytics.service';
import {FirebaseService} from './firebase.service';
import {RouterService} from './router.service';
import {Service} from './service';

interface ServiceProvider {
  analyticsService: AnalyticsService;
  firebaseService: FirebaseService;
  routerService: RouterService;
}

export class InitializationService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  @observable isAppInitialized = false;

  override async initialize() {
    this.sp.analyticsService.initialize();
    this.sp.firebaseService.initialize();
    this.sp.routerService.initialize();

    this.isAppInitialized = true;
  }
}
