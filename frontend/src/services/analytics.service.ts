import {makeObservable} from 'mobx';
import {Service} from './service';
import {Pages, RouterService} from './router.service';

interface ServiceProvider {
  routerService: RouterService;
}

export enum ButtonClick {
  // COHORT_CREATE = 'click_cohort_add',
  // COHORT_DELETE = 'click_cohort_delete',
  EXPERIMENT_DELETE = 'click_experiment_delete',
  EXPERIMENT_EDIT = 'click_experiment_edit',
  EXPERIMENT_FORK = 'click_experiment_fork',
  EXPERIMENT_PREVIEW_CONFIG = 'click_experiment_preview_config',
  EXPERIMENT_SAVE_EXISTING = 'click_experiment_save_edits',
  EXPERIMENT_SAVE_NEW = 'click_experiment_save_new',
  GAME_ADD = 'click_game_add',
  LOGIN = 'click_login',
  // PARTICIPANT_BOOT = 'click_participant_boot',
  // PARTICIPANT_CREATE = 'click_participant_add',
  // PARTICIPANT_JOIN = 'click_participant_join',
  STAGE_ADD = 'click_stage_add',
  STAGE_DELETE = 'click_delete_stage',
  STAGE_MOVE_UP = 'click_stage_move_up',
  STAGE_MOVE_DOWN = 'click_stage_move_down',
  STAGE_NEXT = 'click_stage_next',
  // TRANSFER_INITIATE = 'click_transfer_initiate',
  // TRANSFER_ACCEPT = 'click_transfer_accept',
  // TRANSFER_REJECT = 'click_transfer_reject',
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
