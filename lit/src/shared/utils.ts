/**
 * Shared utils functions.
 */

import {
  ChatContext,
  ChatKind,
  GroupChatStageConfig,
  InfoStageConfig,
  ItemName,
  MediatorConfig,
  MediatorKind,
  PayoutCurrency,
  PayoutStageConfig,
  ProfileStageConfig,
  RevealStageConfig,
  StageConfig,
  StageKind,
  SurveyStageConfig,
  TermsOfServiceStageConfig,
  UnifiedTimestamp,
  VoteForLeaderStageConfig,
} from '@llm-mediation-experiments/utils';
import {micromark} from 'micromark';
import {gfm, gfmHtml} from 'micromark-extension-gfm';
import {v4 as uuidv4} from 'uuid';
import {
  GEMINI_DEFAULT_MODEL,
  PROMPT_INSTRUCTIONS_CHAT_MEDIATOR,
} from './prompts';
import {Snapshot} from './types';

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
export function convertMarkdownToHTML(markdown: string, sanitize = true) {
  const html = micromark(markdown, {
    allowDangerousHtml: !sanitize,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  return html;
}

/**
 *  Adjust experiment stages to Firebase format (e.g., HTML instead of .md)
 */
export function convertExperimentStages(stages: StageConfig[]) {
  return stages.map((stage, index) => {
    if (stage.kind === StageKind.TermsOfService) {
      stage.tosLines = stage.tosLines.map((info) =>
        convertMarkdownToHTML(info)
      );
      return stage;
    }
    return stage;
  });
}

/**
 * Converts UnifiedTimestamp to previewable date.
 */
export function convertUnifiedTimestampToDate(timestamp: UnifiedTimestamp) {
  const date = new Date(timestamp.seconds * 1000);
  return `${date.toDateString()} (${date.getHours()}:${date.getMinutes()})`;
}

/**
 * Collect the data of multiple documents into an array,
 * including the document Firestore ID within the field with the given key.
 */
export function collectSnapshotWithId<T>(snapshot: Snapshot, idKey: keyof T) {
  return snapshot.docs.map((doc) => ({[idKey]: doc.id, ...doc.data()} as T));
}

/** Helper to cleanup experiment data from redundant stage names */
export function excludeName<T extends {name: string}>(obj: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {name, ...rest} = obj;
  return rest;
}
