import { Core } from "./core/core";
import { AnalyticsService } from "./services/analytics.service";
import { AuthService } from "./services/auth.service";
import { CohortService } from "./services/cohort.service";
import { ExperimentService } from "./services/experiment.service";
import { FirebaseService } from "./services/firebase.service";
import { HomeService } from "./services/home.service";
import { InitializationService } from "./services/initialization.service";
import { ParticipantService } from "./services/participant.service";
import { RouterService } from "./services/router.service";
import { SettingsService } from "./services/settings.service";
import { SurveyAnswerService } from "./services/survey.answer";

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
    get initializationService() {
      return self.getService(InitializationService);
    },
    get participantService() {
      return self.getService(ParticipantService);
    },
    get routerService() {
      return self.getService(RouterService);
    },
    get settingsService() {
      return self.getService(SettingsService);
    },
    get surveyAnswerService() {
      return self.getService(SurveyAnswerService);
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
