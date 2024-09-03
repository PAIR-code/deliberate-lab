import { observable } from "mobx";

import { FirebaseService } from "./firebase.service";
import { RouterService } from "./router.service";
import { Service } from "./service";

interface ServiceProvider {
  firebaseService: FirebaseService;
  routerService: RouterService;
}

export class InitializationService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  @observable isAppInitialized = false;

  override async initialize() {
    this.sp.firebaseService.initialize();
    this.sp.routerService.initialize();

    this.isAppInitialized = true;
  }
}
