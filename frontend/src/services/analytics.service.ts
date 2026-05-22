import {makeObservable} from 'mobx';
import {Service} from './service';
import {Pages, RouterService} from './router.service';

interface ServiceProvider {
  routerService: RouterService;
}

export enum ButtonClick {
  AGENT_MEDIATOR_ADD = 'click_agent_mediator_add',
  AGENT_MEDIATOR_PERSONA_ADD = 'click_agent_mediator_persona_add',
  AGENT_PARTICIPANT_ADD = 'click_agent_participant_add',
  AGENT_PARTICIPANT_QUICK_ADD = 'click_agent_participant_quick_add',
  ALERT_ACKNOWLEDGE = 'click_alert_acknowledge',
  ALERT_RESPOND = 'click_alert_respond',
  ALPHA_FEATURES_TOGGLE = 'click_alpha_features_toggle',
  ATTENTION_CHECK_SEND = 'click_attention_check', // sending attention check
  ATTENTION_ACCEPT = 'click_attention_accept', // responded to attention check
  BUG_REPORT_CLICK = 'click_bug_report',
  CHAT_MESSAGE_SEND = 'click_chat_message_send',
  COHORT_ADD = 'click_cohort_add',
  COHORT_LINK_COPY = 'click_cohort_link_copy',
  COHORT_LOCK = 'click_cohort_lock',
  COHORT_SAVE_EXISTING = 'click_cohort_save_edits',
  COHORT_DELETE = 'click_cohort_delete',
  COHORT_UNLOCK = 'click_cohort_unlock',
  DEBUG_MODE_TOGGLE = 'click_debug_mode_toggle',
  DISCUSSION_END = 'click_discussion_end',
  DOCUMENTATION_CLICK = 'click_documentation',
  EXPERIMENT_DELETE = 'click_experiment_delete',
  EXPERIMENT_DOWNLOAD = 'click_experiment_download',
  EXPERIMENT_EDIT = 'click_experiment_edit',
  EXPERIMENT_FORK = 'click_experiment_fork',
  EXPERIMENT_PREVIEW_CONFIG = 'click_experiment_preview_config',
  EXPERIMENT_SAVE_EXISTING = 'click_experiment_save_edits',
  EXPERIMENT_SAVE_NEW = 'click_experiment_save_new',
  LOGIN = 'click_login',
  MANUAL_CHAT_SEND = 'click_manual_chat_send',
  PARTICIPANT_BOOT = 'click_participant_boot',
  PARTICIPANT_ADD = 'click_participant_add',
  PARTICIPANT_JOIN = 'click_participant_join',
  PERSONA_ENHANCE = 'click_persona_enhance',
  PERSONA_GENERATE = 'click_persona_generate',
  PERSONA_REFRESH = 'click_persona_refresh',
  STAGE_ADD = 'click_stage_add',
  STAGE_COPY = 'click_stage_copy',
  STAGE_DELETE = 'click_delete_stage',
  STAGE_MOVE_UP = 'click_stage_move_up',
  STAGE_MOVE_DOWN = 'click_stage_move_down',
  STAGE_NEXT = 'click_stage_next',
  TEMPLATE_LOAD = 'click_template_load',
  TRANSFER_INITIATE = 'click_transfer_initiate',
  TRANSFER_ACCEPT = 'click_transfer_accept',
  TRANSFER_REJECT = 'click_transfer_reject',
  VARIABLE_ADD = 'click_variable_add',
  VARIABLE_DELETE = 'click_variable_delete',
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
