import { Core } from "./core/core";
import { AuthService } from "./services/auth.service";
import { FirebaseService } from "./services/firebase.service";
import { HomeService } from "./services/home.service";
import { InitializationService } from "./services/initialization.service";
import { RouterService } from "./services/router.service";
import { SettingsService } from "./services/settings.service";

/**
 * Defines a map of services to their identifier
 */
export function makeServiceProvider(self: Core) {
  const serviceProvider = {
    get authService() {
      return self.getService(AuthService);
    },
    get firebaseService() {
      return self.getService(FirebaseService);
    },
    get homeService() {
      return self.getService(HomeService);
    },
    get initializationService() {
      return self.getService(InitializationService);
    },
    get routerService() {
      return self.getService(RouterService);
    },
    get settingsService() {
      return self.getService(SettingsService);
    },
  };

  return serviceProvider;
}
