/**
 * Shared utils functions.
 */

import {
  ChatKind,
  GroupChatStageConfig,
  ITEM_NAMES,
  InfoStageConfig,
  ItemName,
  ProfileStageConfig,
  QuestionConfig,
  RatingQuestionConfig,
  RevealVotedStageConfig,
  StageConfig,
  StageKind,
  SurveyQuestionKind,
  SurveyStageConfig,
  TermsOfServiceStageConfig,
  VoteForLeaderStageConfig,
  choices,
  pairs
} from '@llm-mediation-experiments/utils';
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { v4 as uuidv4 } from "uuid";
import { Snapshot } from "./types";

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Create info stage. */
export function createInfoStage(
  name = "Info", content = "Placeholder info"
): InfoStageConfig {
  const infoLines = [content];
  return { kind: StageKind.Info, name, infoLines };
}

/** Create TOS stage. */
export function createTOSStage(
  name = "Terms of Service",
  content = "- Placeholder term 1\n- Placeholder term 2\n- Placeholder term 3",
): TermsOfServiceStageConfig {
  const tosLines = [content];
  return { kind: StageKind.TermsOfService, name, tosLines };
}

/** Create survey stage. */
export function createSurveyStage(
  name = "Survey",
  questions: QuestionConfig[] = []
): SurveyStageConfig {
  return { kind: StageKind.TakeSurvey, name, questions };
}

/** Create profile stage. */
export function createProfileStage(name = "Set profile"): ProfileStageConfig {
  return { kind: StageKind.SetProfile, name };
}

/** Create chat (with ranking discussion) stage. */
export function createChatStage(
  name = "Group chat",
  ratingsToDiscuss: { item1: ItemName; item2: ItemName }[] = []
): GroupChatStageConfig {
  if (ratingsToDiscuss.length === 0) {
    return {
      name,
      kind: StageKind.GroupChat,
      chatId: generateId(),
      chatConfig: {
        kind: ChatKind.SimpleChat,
      }
    };
  }

  return {
    name,
    kind: StageKind.GroupChat,
    chatId: generateId(),
    chatConfig: {
      kind: ChatKind.ChatAboutItems,
      ratingsToDiscuss
    }
  };
}

/** Create leader vote (election) stage. */
export function createVoteForLeaderStage(
  name = "Leader election"
): VoteForLeaderStageConfig {
  return { kind: StageKind.VoteForLeader, name };
}

/**
 * Create leader reveal stage.
 * NOTE: This currently does not assign the VoteForLeader stage to
 * the RevealVoted stage; rather, this is assigned in `convertExperimentStages`
 * with the assumption that there is only one VoteForLeader stage.
 *
 * TODO: Make this an implicit "Reveal" stage for all stages, not just leader
 * election.
 */
export function createRevealVotedStage(
  name = "Reveal"
): RevealVotedStageConfig {
  return { kind: StageKind.RevealVoted, name, pendingVoteStageName: "" };
}

/**
 * Create Lost at Sea game module stages.
 *
 * This includes:
 *   2 individual tasks with the same randomly-generated item pairs
 *   1 chat discussion based around those item pairs
 *   1 leader task with different randomly-generated item pairs
 */

export function createLostAtSeaModuleStages(numPairs = 5): StageConfig[] {
  const stages: StageConfig[] = [];

  const middleIndex = Math.ceil(ITEM_NAMES.length / 2);

  // Take random items from the first half for the individual tasks.
  const INDIVIDUAL_ITEM_NAMES = ITEM_NAMES.slice(0, middleIndex);
  const INDIVIDUAL_ITEM_PAIRS = choices(pairs(INDIVIDUAL_ITEM_NAMES), numPairs);

  // Take random items from the second half for the leader tasks.
  const LEADER_ITEM_NAMES = ITEM_NAMES.slice(middleIndex);
  const LEADER_ITEM_PAIRS = choices(pairs(LEADER_ITEM_NAMES), numPairs);

  // Add individual surveys
  const INDIVIDUAL_QUESTIONS: RatingQuestionConfig[] = INDIVIDUAL_ITEM_PAIRS.map(
    (pair, index) => getRatingQuestionFromPair(pair, index)
  );

  stages.push(createSurveyStage("Individual task", INDIVIDUAL_QUESTIONS));

  // Add chat with individual item pairs as discussion
  stages.push(
    createChatStage(
      "Group chat",
      INDIVIDUAL_ITEM_PAIRS.map(([i1, i2]) => ({ item1: i1, item2: i2 }))
    )
  );

  stages.push(createSurveyStage("Individual task (updated)", INDIVIDUAL_QUESTIONS));

  // Add leader survey
  const LEADER_QUESTIONS: RatingQuestionConfig[] = LEADER_ITEM_PAIRS.map(
    (pair, index) => getRatingQuestionFromPair(pair, index)
  );

  stages.push(createSurveyStage("Leader task", LEADER_QUESTIONS));

  return stages;
}

/**
 * Uses item pair to create survey RatingQuestion.
 */
export function getRatingQuestionFromPair(
  pair: [string, string],
  id: number,
  questionText = "Choose the item that would be more helpful to your survival",
): RatingQuestionConfig {

  const [one, two] = pair;
  const item1: ItemName = (one as ItemName);
  const item2: ItemName = (two as ItemName);

  return {
    id,
    kind: SurveyQuestionKind.Rating,
    questionText,
    item1,
    item2,
  };
}


/**
 * Check if stage is part of the LostAtSea module.
 * TODO: Use more robust logic, e.g., add a moduleType field to track this.
 */
export function isLostAtSeaModuleStage(stage: StageConfig) {
  // This relies on the fact that we only allow RatingQuestions and Chat
  // stages for Lost at Sea module stages.
  return (stage.kind === StageKind.TakeSurvey &&
    stage.questions.find(q => q.kind === SurveyQuestionKind.Rating))
    || (stage.kind === StageKind.GroupChat && stage.chatConfig.kind === ChatKind.ChatAboutItems);
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
 *  and add numbering to stages.
 */
export function convertExperimentStages(stages: StageConfig[]) {
  const addIndexToStageName = (name: string, index: number) => {
    if (index + 1 < 10) {
      return `0${index + 1}. ${name}`;
    }
    return `${index + 1}. ${name}`;
  };

  return stages.map((stage, index) => {
    stage.name = addIndexToStageName(stage.name, index);

    if (stage.kind === StageKind.Info) {
      stage.infoLines = stage.infoLines.map(
        info => convertMarkdownToHTML(info)
      );
      return stage;
    }
    if (stage.kind === StageKind.TermsOfService) {
      stage.tosLines = stage.tosLines.map(
        info => convertMarkdownToHTML(info)
      );
      return stage;
    }
    if (stage.kind === StageKind.RevealVoted) {
      // NOTE: This assumes there is only one VoteForLeader stage
      // and that it is ordered before the reveal stage.
      const voteIndex = findStageKind(stages, StageKind.VoteForLeader);
      stage.pendingVoteStageName = stages[voteIndex]?.name;
      return stage;
    }
    return stage;
  })
}

/**
 * Adjust template stages to experiment stage format
 * (e.g., strip stage numbers)
 */
export function convertTemplateStages(stages: StageConfig[]) {
  const stripNumbersFromTitle = (name: string) => {
    const titleParts = name.split('. ');
    if (titleParts.length > 1) {
      return `${titleParts[1]}`;
    }
    return `Untitled stage`;
  };

  return stages.map((stage) => {
    stage.name = stripNumbersFromTitle(stage.name);
    return stage;
  });
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
