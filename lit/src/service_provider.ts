import { Core } from "./core/core";
import { AuthService } from "./services/auth_service";
import { ChatService } from "./services/chat_service";
import { ExperimentService } from "./services/experiment_service";
import { FirebaseService } from "./services/firebase_service";
import { InitializationService } from "./services/initialization_service";
import { RouterService } from "./services/router_service";
import { SettingsService } from "./services/settings_service";

import {
  ExperimentConfigService
} from "./services/config/experiment_config_service";
import { InfoConfigService } from './services/config/info_config_service';
import { TOSConfigService } from './services/config/tos_config_service';
import {
  SurveyConfigService
} from "./services/config/survey_config_service";

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
    get firebaseService() {
      return self.getService(FirebaseService);
    },
    get authService() {
      return self.getService(AuthService);
    },
    get settingsService() {
      return self.getService(SettingsService);
    },
    get experimentService() {
      return self.getService(ExperimentService);
    },
    get chatService() {
      return self.getService(ChatService);
    },
    get experimentConfigService() {
      return self.getService(ExperimentConfigService);
    },
    get infoConfigService() {
      return self.getService(InfoConfigService);
    },
    get tosConfigService() {
      return self.getService(TOSConfigService);
    },
    get surveyConfigService() {
      return self.getService(SurveyConfigService);
    }
  };

  return serviceProvider;
}
