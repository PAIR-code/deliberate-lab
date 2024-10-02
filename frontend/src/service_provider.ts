import { Core } from "./core/core";
import { AnalyticsService } from "./services/analytics.service";
import { AuthService } from "./services/auth.service";
import { CohortService } from "./services/cohort.service";
import { ExperimentService } from "./services/experiment.service";
import { FirebaseService } from "./services/firebase.service";
import { HomeService } from "./services/home.service";
import { ImageService } from "./services/image.service";
import { InitializationService } from "./services/initialization.service";
import { ParticipantService } from "./services/participant.service";
import { ParticipantAnswerService } from "./services/participant.answer";
import { RouterService } from "./services/router.service";
import { SettingsService } from "./services/settings.service";
import { ExperimentEditor } from "./services/experiment.editor";
import { ExperimentManager } from "./services/experiment.manager";

/**
 * Defines a map of services to their identifier
 */
export function makeServiceProvider(self: Core) {
  const serviceProvider = {
    get analyticsService() {
      return self.getService(AnalyticsService);
    },
    get authService() {
      return self.getService(AuthService);
    },
    get cohortService() {
      return self.getService(CohortService);
    },
    get experimentService() {
      return self.getService(ExperimentService);
    },
    get firebaseService() {
      return self.getService(FirebaseService);
    },
    get homeService() {
      return self.getService(HomeService);
    },
    get imageService() {
      return self.getService(ImageService);
    },
    get initializationService() {
      return self.getService(InitializationService);
    },
    get participantService() {
      return self.getService(ParticipantService);
    },
    get participantAnswerService() {
      return self.getService(ParticipantAnswerService);
    },
    get routerService() {
      return self.getService(RouterService);
    },
    get settingsService() {
      return self.getService(SettingsService);
    },
    // Editors
    get experimentEditor() {
      return self.getService(ExperimentEditor);
    },
    // Managers
    get experimentManager() {
      return self.getService(ExperimentManager);
    },
  };

  return serviceProvider;
}
