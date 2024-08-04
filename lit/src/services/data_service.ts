import { computed, makeObservable, observable } from "mobx";
import { Service } from "./service";
import { ExperimenterService } from "./experimenter_service";
import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";

interface ServiceProvider {
  experimenterService: ExperimenterService;
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Handles data previews and downloads */
export class DataService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string|null = null; // null if experiment group
  @observable groupId: string|null = null; // null if single experiment

  updateForCurrentRoute() {
    const experiment = this.sp.routerService.activeRoute.params["experiment"];
    const group = this.sp.routerService.activeRoute.params["experiment_group"];

    if (experiment !== this.experimentId || group !== this.groupId) {
      this.loadDataForCurrentRoute(experiment, group);
    }
  }

  loadDataForCurrentRoute(experimentId: string, groupId: string) {
    this.experimentId = experimentId;
    this.groupId = groupId;
  }
}
