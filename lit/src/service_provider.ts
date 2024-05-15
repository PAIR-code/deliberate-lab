import { Core } from "./core/core";
import { InitializationService } from "./services/initialization_service";
import { RouterService } from "./services/router_service";
import { SettingsService } from "./services/settings_service";

/**
 * Defines a map of services to their identifier
 */
export function makeServiceProvider(self: Core) {
  const serviceProvider = {
    get routerService() {
      return self.getService(RouterService);
    },
    get initializationService() {
      return self.getService(InitializationService);
    },
    get settingsService() {
      return self.getService(SettingsService);
    },
  };

  return serviceProvider;
}
