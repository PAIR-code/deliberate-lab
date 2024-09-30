import {makeObservable} from 'mobx';
import {Service} from './service';
import {Pages, RouterService} from './router.service';

interface ServiceProvider {
  routerService: RouterService;
}

export enum ButtonClick {
  // COHORT_CREATE = 'click_experimenter_add_cohort',
  // COHORT_DELETE = 'click_experimenter_delete_cohort',
  EXPERIMENT_DELETE = 'click_experiment_delete',
  EXPERIMENT_EDIT = 'click_experiment_edit',
  EXPERIMENT_FORK = 'click_experiment_fork',
  EXPERIMENT_PREVIEW_CONFIG = 'click_experiment_preview_config',
  EXPERIMENT_SAVE_EXISTING = 'click_experiment_save_edits',
  EXPERIMENT_SAVE_NEW = 'click_experiment_save_new',
  // GAME_ADD = 'click_load_game',
  LOGIN = 'click_login',
  // PARTICIPANT_BOOT = 'click_experimenter_boot_participant',
  // PARTICIPANT_CREATE = 'click_experimenter_add_participant',
  // PARTICIPANT_JOIN = 'click_participant_join',
  // STAGE_ADD = 'click_add_stage',
  // STAGE_DELETE = 'click_delete_stage',
  // STAGE_NEXT = 'click_next_stage',
  // TRANSFER_INITIATE = 'click_experimenter_initiate_transfer',
  // TRANSFER_ACCEPT = 'click_participant_accept_transfer',
  // TRANSFER_REJECT = 'click_participant_reject_transfer',
}

/** Manages Google Analytics. */
export class AnalyticsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  trackButtonClick(buttonClick: ButtonClick) {
    if (typeof gtag === 'function') {
      // Track as page view for now
      gtag('event', 'page_view', {
        page_title: buttonClick,
        page_location: this.sp.routerService.activeRoute.path,
      });
    }
  }

  trackPageView(page: Pages, path: string) {
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', {
        page_title: page,
        page_location: path,
      });
    }
  }
}
