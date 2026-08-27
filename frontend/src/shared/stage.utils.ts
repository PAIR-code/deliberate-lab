import {html, nothing} from 'lit';
import {ChatMessage, UnifiedTimestamp} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase/firestore';

/** Returns the timestamp of the first chat message, or null if none. */
export function getChatStartTimestamp(
  chatStageId: string,
  chatMap: Record<string, ChatMessage[]>,
): UnifiedTimestamp | null {
  const messages = chatMap[chatStageId] ?? [];
  if (messages.length) {
    return messages[0].timestamp;
  }
  return null;
}

/** Returns time elapsed in seconds since chat started, or null if not started. */
export function getChatTimeElapsedInSeconds(
  chatStageId: string,
  chatMap: Record<string, ChatMessage[]>,
): number | null {
  const start = getChatStartTimestamp(chatStageId, chatMap);
  if (!start) return null;
  return Timestamp.now().seconds - start.seconds;
}

/** Returns time remaining in seconds for the chat, or null if not started or no limit. */
export function getChatTimeRemainingInSeconds(
  chatStage: {id: string; timeLimitInMinutes: number | null} | null | undefined,
  chatMap: Record<string, ChatMessage[]>,
  discussionStartTimestamp?: UnifiedTimestamp | null,
): number | null {
  if (!chatStage || !chatStage.timeLimitInMinutes) return null;

  const startTimestamp =
    discussionStartTimestamp ?? getChatStartTimestamp(chatStage.id, chatMap);
  if (!startTimestamp) return null;

  const elapsed = Timestamp.now().seconds - startTimestamp.seconds;
  const remaining = chatStage.timeLimitInMinutes * 60 - elapsed;
  return remaining > 0 ? Math.floor(remaining) : 0;
}

export interface StageWithTimeLimit {
  timeLimitInMinutes: number | null;
  timeMinimumInMinutes: number | null;
}

export interface RenderTimeLimitOptions<T extends StageWithTimeLimit> {
  stage: T | undefined;
  canEdit: boolean;
  onStageChange: (stage: T) => void;
  checkboxTitle?: string;
  maxTimeLabel?: string;
  minTimeLabel?: string;
}

/**
 * Renders the stage time limit editor controls (toggle, max time, min time).
 */
export function renderTimeLimit<T extends StageWithTimeLimit>(
  options: RenderTimeLimitOptions<T>,
) {
  const {
    stage,
    canEdit,
    onStageChange,
    checkboxTitle = 'Disable conversation after a fixed amount of time',
    maxTimeLabel = 'Maximum time in minutes (starting at first message). Participant will remain in chat until minimum messages requirement is met, even if maximum time has passed.',
    minTimeLabel = 'Minimum time participants must stay (in minutes). Takes precedence over maximum number of messages.',
  } = options;

  if (!stage) return nothing;

  const timeLimit = stage.timeLimitInMinutes;

  const updateCheck = () => {
    const isSet = stage.timeLimitInMinutes != null;
    onStageChange({
      ...stage,
      timeLimitInMinutes: isSet ? null : 20,
      timeMinimumInMinutes: null,
    });
  };

  const updateMaxTime = (e: InputEvent) => {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    const timeLimitInMinutes = val > 0 ? Math.floor(val) : null;
    onStageChange({
      ...stage,
      timeLimitInMinutes,
    });
  };

  const updateMinTime = (e: InputEvent) => {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    const minTime = val > 0 ? Math.floor(val) : null;
    const max = stage.timeLimitInMinutes;
    const timeMinimumInMinutes =
      minTime != null && max != null ? Math.min(minTime, max) : minTime;
    onStageChange({
      ...stage,
      timeMinimumInMinutes,
    });
  };

  return html`
    <div class="config-item">
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${timeLimit != null}
          ?disabled=${!canEdit}
          @click=${updateCheck}
        >
        </md-checkbox>
        <div>${checkboxTitle}</div>
      </div>
      ${timeLimit != null
        ? html`
            <div class="number-input tab">
              <label for="timeLimit">${maxTimeLabel}</label>
              <input
                type="number"
                id="timeLimit"
                name="timeLimit"
                min="1"
                step="1"
                .value=${timeLimit}
                ?disabled=${!canEdit}
                @input=${updateMaxTime}
              />
            </div>
            <div class="number-input tab tab-bottom">
              <label for="timeMinimum">${minTimeLabel}</label>
              <input
                type="number"
                id="timeMinimum"
                name="timeMinimum"
                min="1"
                step="1"
                .max=${timeLimit ?? ''}
                .value=${stage.timeMinimumInMinutes ?? ''}
                placeholder="No minimum"
                ?disabled=${!canEdit}
                @input=${updateMinTime}
              />
            </div>
          `
        : nothing}
    </div>
  `;
}
