import { observable } from "mobx";

import { RouterService } from "./router_service";
import { Service } from "./service";

interface ServiceProvider {
  routerService: RouterService;
}

export class InitializationService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  @observable isAppInitialized = false;

  override async initialize() {
    const { routerService } = this.sp;
    routerService.initialize();

    this.isAppInitialized = true;
  }
}
