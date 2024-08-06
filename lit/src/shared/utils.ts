/**
 * Shared utils functions.
 */

import {
  ChatContext,
  ChatKind,
  GroupChatStageConfig,
  InfoStageConfig,
  ItemName,
  LostAtSeaSurveyStagePublicData,
  LostAtSeaQuestionAnswer,
  MediatorConfig,
  MediatorKind,
  ParticipantProfileExtended,
  PayoutCurrency,
  PayoutStageConfig,
  ProfileStageConfig,
  PublicStageData,
  RevealStageConfig,
  ScoringBundle,
  ScoringItem,
  StageConfig,
  StageKind,
  SurveyStageConfig,
  TermsOfServiceStageConfig,
  UnifiedTimestamp,
  VoteForLeaderStageConfig,
  VoteForLeaderStagePublicData,
} from '@llm-mediation-experiments/utils';
import {micromark} from 'micromark';
import {gfm, gfmHtml} from 'micromark-extension-gfm';
import {v4 as uuidv4} from 'uuid';
import {
  GEMINI_DEFAULT_MODEL,
  PROMPT_INSTRUCTIONS_CHAT_MEDIATOR,
} from './prompts';
import {AnswerItem, PayoutBreakdownItem, PayoutData, Snapshot} from './types';

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Create info stage. */
export function createInfoStage(
  config: Partial<InfoStageConfig> = {}
): InfoStageConfig {
  return {
    id: generateId(),
    kind: StageKind.Info,
    name: config.name ?? 'Info',
    description: config.description ?? '',
    popupText: config.popupText ?? '',
    infoLines: config.infoLines ?? ['Placeholder info'],
  };
}

/** Create TOS stage. */
export function createTOSStage(
  config: Partial<TermsOfServiceStageConfig> = {}
): TermsOfServiceStageConfig {
  return {
    id: generateId(),
    kind: StageKind.TermsOfService,
    name: config.name ?? 'Terms of service',
    description:
      config.description ?? 'Acknowledge the terms of service to proceed.',
    popupText: config.popupText ?? '',
    tosLines: config.tosLines ?? [
      '- Placeholder term 1\n- Placeholder term 2\n- Placeholder term 3',
    ],
  };
}

/** Create survey stage. */
export function createSurveyStage(
  config: Partial<SurveyStageConfig> = {}
): SurveyStageConfig {
  return {
    id: generateId(),
    kind: StageKind.TakeSurvey,
    name: config.name ?? 'Survey',
    description: config.description ?? '',
    popupText: config.popupText ?? '',
    questions: config.questions ?? [],
  };
}

/** Create profile stage. */
export function createProfileStage(name = 'Set profile'): ProfileStageConfig {
  // Bug: Experiment can't be created with a profile description.
  return {id: generateId(), kind: StageKind.SetProfile, name};
}

/** Create chat (with ranking discussion) stage. */
export function createChatStage(
  name = 'Group discussion',
  description = 'Group discussion description',
  ratingsToDiscuss: {item1: ItemName; item2: ItemName}[] = [],
  popupText = ''
): GroupChatStageConfig {
  if (ratingsToDiscuss.length === 0) {
    return {
      id: generateId(),
      name,
      description,
      kind: StageKind.GroupChat,
      chatId: generateId(),
      chatConfig: {
        kind: ChatKind.SimpleChat,
      },
      mediators: [],
      popupText,
    };
  }

  return {
    id: generateId(),
    name,
    description,
    kind: StageKind.GroupChat,
    chatId: generateId(),
    chatConfig: {
      kind: ChatKind.ChatAboutItems,
      ratingsToDiscuss,
    },
    mediators: [],
    popupText,
  };
}

/** Create default LLM mediator. */
export function createMediator(
  name = 'LLM Mediator',
  avatar = '🤖'
): MediatorConfig {
  return {
    id: generateId(),
    name,
    avatar,
    model: GEMINI_DEFAULT_MODEL,
    prompt: PROMPT_INSTRUCTIONS_CHAT_MEDIATOR,
    chatContext: ChatContext.All,
    kind: MediatorKind.Automatic,
    filterMediatorMessages: true,
  };
}

/** Create leader vote (election) stage. */
export function createVoteForLeaderStage(
  config: Partial<VoteForLeaderStageConfig> = {}
): VoteForLeaderStageConfig {
  return {
    id: generateId(),
    kind: StageKind.VoteForLeader,
    name: config.name ?? 'Leader election',
    description: config.description ?? 'Vote for the leader here.',
    popupText: config.popupText ?? '',
  };
}

/**
 * Create composite payout stage.
 */
export function createPayoutStage(
  config: Partial<PayoutStageConfig> = {}
): PayoutStageConfig {
  return {
    id: generateId(),
    kind: StageKind.Payout,
    composite: true,
    name: config.name ?? 'Payout',
    description: config.description ?? '',
    popupText: config.popupText ?? '',
    payouts: config.payouts ?? [],
    currency: config.currency ?? PayoutCurrency.USD,
  };
}

/**
 * Create composite reveal stage.
 */
export function createRevealStage(
  config: Partial<RevealStageConfig> = {}
): RevealStageConfig {
  return {
    id: generateId(),
    kind: StageKind.Reveal,
    composite: true,
    name: config.name ?? 'Leader reveal',
    description: config.description ?? 'This is the outcome of the vote.',
    popupText: config.popupText ?? '',
    stagesToReveal: config.stagesToReveal ?? [],
  };
}

/**
 * Get ratingsToDiscuss from chatConfig (empty if not ChatAboutItems kind).
 */
export function getChatRatingsToDiscuss(stage: GroupChatStageConfig) {
  if (!stage) {
    return [];
  }
  return stage.chatConfig.kind === ChatKind.ChatAboutItems
    ? stage.chatConfig.ratingsToDiscuss
    : [];
}

/**
 * Find index of specific stage kind.
 */
export function findStageKind(stages: StageConfig[], kind: StageKind) {
  return stages.findIndex((stage) => stage.kind === kind);
}

/**
 * Return election survey stages from given list of stages.
 */
export function getElectionStages(stages: StageConfig[]) {
  return stages.filter((stage) => stage.kind === StageKind.VoteForLeader);
}

/** Use micromark to convert Git-flavored markdown to HTML. */
export function convertMarkdownToHTML(
  markdown: string | null,
  sanitize = true
) {
  if (!markdown) {
    return '';
  }
  const html = micromark(markdown, {
    allowDangerousHtml: !sanitize,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  return html;
}

/** Calculate experiment payouts for current payout stage.
 * Return currency, payout map from participant public ID to value.
 */
export function getPayouts(
  stage: PayoutStageConfig,
  privateParticipants: ParticipantProfileExtended[],
  publicStageDataMap: Record<string, PublicStageData | undefined>
): PayoutData {
  const payouts: Record<string, number> = {}; // participant ID, amount
  const payoutBreakdown: Record<string, PayoutBreakdownItem[]> = {}; // participant ID, scoring breakdown
  privateParticipants.forEach((participant) => {
    const getAnswerItems = (item: ScoringItem): AnswerItem[] => {
      // Use leader's answers if indicated, else current participant's answers
      if (item.leaderStageId && item.leaderStageId.length > 0) {
        const leaderPublicId =
          (
            publicStageDataMap[
              item.leaderStageId
            ] as VoteForLeaderStagePublicData
          ).currentLeader ?? '';
        const leaderAnswers = (
          publicStageDataMap[
            item.surveyStageId
          ] as LostAtSeaSurveyStagePublicData
        ).participantAnswers[leaderPublicId];

        if (!leaderAnswers) return [];

        return item.questions.map((question) => {
          return {
            ...question,
            leaderPublicId,
            userAnswer: (
              leaderAnswers[question.id] as LostAtSeaQuestionAnswer
            ).choice,
          };
        });
      }

      const userAnswers = (
        publicStageDataMap[
          item.surveyStageId
        ] as LostAtSeaSurveyStagePublicData
      ).participantAnswers[participant.publicId];
      if (!userAnswers) return [];
      return item.questions.map((question) => {
        return {
          ...question,
          userAnswer: (userAnswers[question.id] as LostAtSeaQuestionAnswer)
            .choice,
        };
      });
    };

    // Calculate score for bundle
    const getBundleScore = (bundle: ScoringBundle) => {
      let score = 0;
      bundle.scoringItems.forEach((item) => {
        // Calculate score for item
        const answerItems: AnswerItem[] = getAnswerItems(item);

        if (answerItems.length === 0) {
          return item.fixedCurrencyAmount;
        }

        const numCorrect = () => {
          let count = 0;
          answerItems.forEach((answer) => {
            if (answer.userAnswer === answer.answer) {
              count += 1;
            }
          });
          return count;
        };
        score +=
          item.fixedCurrencyAmount +
          item.currencyAmountPerQuestion * numCorrect();
      });
      return score;
    };

    // Assign payout for participant
    let totalScore = 0;
    let breakdowns: PayoutBreakdownItem[] = [];
    const scoring: ScoringBundle[] = stage.scoring ?? [];
    scoring.forEach((bundle) => {
      // Combine all bundles to get total score
      const score = getBundleScore(bundle);
      breakdowns.push({ name: bundle.name, score });
      totalScore += score;
    });

    payouts[participant.publicId] = totalScore;
    payoutBreakdown[participant.publicId] = breakdowns;
  });

  return {currency: stage.currency, payouts, payoutBreakdown};
}

/**
 * Converts UnifiedTimestamp to previewable date.
 */
export function convertUnifiedTimestampToDate(timestamp: UnifiedTimestamp) {
  const date = new Date(timestamp.seconds * 1000);
  return `${date.toDateString()} (${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')})`;
}

/**
 * Collect the data of multiple documents into an array,
 * including the document Firestore ID within the field with the given key.
 */
export function collectSnapshotWithId<T>(snapshot: Snapshot, idKey: keyof T) {
  return snapshot.docs.map((doc) => ({[idKey]: doc.id, ...doc.data()} as T));
}