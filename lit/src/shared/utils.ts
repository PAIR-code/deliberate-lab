/**
 * Shared utils functions.
 */

import { HttpsCallableResult } from 'firebase/functions';
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { v4 as uuidv4 } from "uuid";
import { Snapshot } from "./types";
import {
  ChatKind,
  InfoStageConfig,
  ItemName,
  ProfileStageConfig,
  RevealVotedStageConfig,
  StageConfig,
  StageKind,
  SurveyStageConfig,
  SurveyQuestionKind,
  TermsOfServiceStageConfig,
  VoteForLeaderStageConfig
} from '@llm-mediation-experiments/utils';

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
  questions = []
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
) {
  return {
    name,
    kind: StageKind.GroupChat,
    chatConfig: {
      kind: ChatKind.ChatAboutItems,
      chatId: generateId(),
      ratingsToDiscuss
    }
  };
}

/** Create leader vote stage. */
export function createVoteForLeaderStage(
  name = "Leader vote"
): VoteForLeaderStageConfig {
  return { kind: StageKind.VoteForLeader, name };
}

/**
 * Create leader reveal stage.
 * NOTE: This currently does not assign the VoteForLeader stage to
 * the RevealVoted stage; rather, this is assigned in `convertExperimentStages`
 * with the assumption that there is only one VoteForLeader stage.
 */
export function createRevealVotedStage(
  name = "Leader reveal"
): RevealVotedStageConfig {
  return { kind: StageKind.RevealVoted, name, pendingVoteStageName: "" };
}

/**
 * Check if stage is part of ranking module.
 * TODO: Use more robust logic, e.g., add a moduleType field to track this.
 */
export function isRankingModuleStage(stage: StageConfig) {
  // This relies on the fact that we only allow RatingQuestions and Chat
  // stages for ranking module stages.
  return (stage.kind === StageKind.TakeSurvey &&
    stage.questions.find(q => q.kind === SurveyQuestionKind.Rating))
    || stage.kind === StageKind.GroupChat;
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
      // NOTE: This assumes there is only one VoteForLeader stage.
      const voteIndex = findStageKind(stages, StageKind.VoteForLeader);
      stage.pendingVoteStageName = addIndexToStageName(stage.name, voteIndex);
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

