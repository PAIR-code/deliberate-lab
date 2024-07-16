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
  ProfileStageConfig,
  QuestionConfig,
  RatingQuestionConfig,
  RevealStageConfig,
  StageConfig,
  StageKind,
  SurveyQuestionKind,
  SurveyStageConfig,
  TermsOfServiceStageConfig,
  VoteForLeaderStageConfig,
} from '@llm-mediation-experiments/utils';
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { v4 as uuidv4 } from "uuid";
import { GEMINI_DEFAULT_MODEL, PROMPT_INSTRUCTIONS_CHAT_MEDIATOR } from "./prompts";
import { Snapshot } from "./types";

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Create info stage. */
export function createInfoStage(
  name = "Info", description = "Info description", content = ["Placeholder info"]
): InfoStageConfig {
  const infoLines = content;
  return { id: generateId(), kind: StageKind.Info, name, description, infoLines };
}

/** Create TOS stage. */
export function createTOSStage(
  name = "Terms of service",
  description = "Acknowledge the terms of service to proceed.",
  content = "- Placeholder term 1\n- Placeholder term 2\n- Placeholder term 3",
): TermsOfServiceStageConfig {
  const tosLines = [content];
  return { id: generateId(), kind: StageKind.TermsOfService, name, description, tosLines };
}

/** Create survey stage. */
export function createSurveyStage(
  name = "Survey",
  description = "Survey description",
  questions: QuestionConfig[] = [],
): SurveyStageConfig {
  return { id: generateId(), kind: StageKind.TakeSurvey, name, description, questions };
}

/** Create profile stage. */
export function createProfileStage(name = "Set profile"): ProfileStageConfig {
  // Bug: Experiment can't be created with a profile description.
  return { id: generateId(), kind: StageKind.SetProfile, name};
}

/** Create chat (with ranking discussion) stage. */
export function createChatStage(
  name = "Group discussion",
  description = "Group discussion description",
  ratingsToDiscuss: { item1: ItemName; item2: ItemName }[] = []
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
      ratingsToDiscuss
    },
    mediators: [],
  };
}

/** Create default LLM mediator. */
export function createMediator(
  name = "LLM Mediator",
  avatar = "🤖",
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
  name = "Leader election",
  description = "Vote for the leader here.",
): VoteForLeaderStageConfig {
  return { id: generateId(), kind: StageKind.VoteForLeader, name, description };
}

/**
 * Create composite reveal stage.
 */
export function createRevealStage(
  name = "Reveal",
  description = "This shows results from other stages, e.g., leader election.",
  stagesToReveal: string [] = []
): RevealStageConfig {
  return {
    id: generateId(), kind: StageKind.Reveal, composite: true, name, description, stagesToReveal
  };
}

/**
 * Get ratingsToDiscuss from chatConfig (empty if not ChatAboutItems kind).
 */
export function getChatRatingsToDiscuss(stage: GroupChatStageConfig) {
  if (!stage) {
    return [];
  }
  return stage.chatConfig.kind === ChatKind.ChatAboutItems ?
    stage.chatConfig.ratingsToDiscuss : [];
}

/**
 * Find index of specific stage kind.
 * NOTE: Currently used to assign VoteForLeader stage to Reveal stage
 * (as stage names are not guaranteed to be unique, and we currenly
 * only allow one VoteForLeader stage)
 */
export function findStageKind(stages: StageConfig[], kind: StageKind) {
  return stages.findIndex(stage => stage.kind === kind);
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
      stage.tosLines = stage.tosLines.map(
        info => convertMarkdownToHTML(info)
      );
      return stage;
    }
    return stage;
  })
}

/**
 * Collect the data of multiple documents into an array,
 * including the document Firestore ID within the field with the given key.
 */
export function collectSnapshotWithId<T>(snapshot: Snapshot, idKey: keyof T) {
  return snapshot.docs.map((doc) => ({ [idKey]: doc.id, ...doc.data() }) as T);
}

/** Helper to cleanup experiment data from redundant stage names */
export function excludeName<T extends { name: string }>(obj: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, ...rest } = obj;
  return rest;
}
