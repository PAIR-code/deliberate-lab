import {html, nothing, TemplateResult} from 'lit';

import {
  MediatorProfileExtended,
  getAgentStatusDisplayText,
} from '@deliberation-lab/utils';

export function renderMediatorStatusChip(
  mediator: MediatorProfileExtended,
  className = 'chip secondary',
): TemplateResult | typeof nothing {
  if (!mediator.agentConfig) {
    return nothing;
  }

  return html`<div class="${className}">
    🤖 ${getAgentStatusDisplayText(mediator.currentStatus)}
  </div>`;
}
