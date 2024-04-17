/* eslint-disable @typescript-eslint/no-explicit-any */
/** Validation for stage updates */

import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { PROGRESSION } from './participants.validation';
import { validateQuestionUpdateAndMerge } from './questions.validation';

// Generic definition

// Copied from stages.types.ts
export enum StageKind {
  AcceptTosAndSetProfile = 'acceptTosAndSetProfile',
  GroupChat = 'groupChat',
  VoteForLeader = 'voteForLeader',
  RevealVoted = 'leaderReveal',
  TakeSurvey = 'takeSurvey',
  // RankItems = 'rankItems',
}

export const GenericStageUpdate = Type.Object(
  {
    name: Type.String(), // Stage name
    data: Type.Any(), // Data to update
    ...PROGRESSION,
  },
  { additionalProperties: false },
);

export type GenericStageUpdate = Static<typeof GenericStageUpdate>;

export const ToggleReadyToEndChat = Type.Object(
  {
    readyToEndChat: Type.Boolean(),
    chatId: Type.String(),
  },
  { additionalProperties: false },
);

export type ToggleReadyToEndChat = Static<typeof ToggleReadyToEndChat>;

// ********************************************************************************************* //
//                                         DEFINITIONS                                           //
// ********************************************************************************************* //

export const SurveyUpdate = Type.Object({
  questions: Type.Array(Type.Any()),
});

export const ChatUpdate = Type.Object({
  readyToEndChat: Type.Boolean(),
});

export type SurveyUpdate = Static<typeof SurveyUpdate>;

export type ChatUpdate = Static<typeof ChatUpdate>;

// ********************************************************************************************* //
//                                             UTILS                                             //
// ********************************************************************************************* //

/** Merges incoming update with the stage data in place.
 *
 * @param stage Existing stage data from database
 * @param data Incoming update data from the request
 * @returns true if the update is valid and the merge was successful, false otherwise
 */
export const validateStageUpdateAndMerge = (stage: any, data: any): boolean => {
  switch (stage.kind as StageKind) {
    case StageKind.TakeSurvey:
      return validateSurveyUpdateAndMerge(stage, data);

    case StageKind.GroupChat:
      return validateChatUpdateAndMerge(stage, data);

    default:
      return false;
  }
};

export const validateSurveyUpdateAndMerge = (stage: any, data: any): boolean => {
  if (Value.Check(SurveyUpdate, data)) {
    data.questions.forEach((questionUpdate, index) => {
      validateQuestionUpdateAndMerge(stage.config.questions[index], questionUpdate);
    });

    return true;
  }
  return false;
};

export const validateChatUpdateAndMerge = (stage: any, data: any): boolean => {
  if (Value.Check(ChatUpdate, data)) {
    stage.config.readyToEndChat = true;
    return true;
  }
  return false;
};
