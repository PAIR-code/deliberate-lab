import { Type, type Static } from '@sinclair/typebox';
import {
  GroupChatStageConfigData,
  ProfileStageConfigData,
  RevealVotedConfigData,
  SurveyStageConfigData,
  TermsOfServiceConfigData,
  VoteForLeaderConfigData,
} from './stages.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Generic experiment or template deletion data */
export const ExperimentDeletionData = Type.Object(
  {
    // Discriminate between experiment and template
    type: Type.Union([Type.Literal('experiments'), Type.Literal('templates')]),

    id: Type.String({ minLength: 1 }),
  },
  strict,
);

export type ExperimentDeletionData = Static<typeof ExperimentDeletionData>;

/**
 * Generic experiment or template creation data
 */
export const ExperimentCreationData = Type.Object(
  {
    // Discriminate between experiment and template
    type: Type.Union([Type.Literal('experiments'), Type.Literal('templates')]),

    // Experiment / Template metadata
    metadata: Type.Object(
      {
        name: Type.String({ minLength: 1 }),
      },
      strict,
    ),

    // Stage config data
    stages: Type.Array(
      Type.Union([
        TermsOfServiceConfigData,
        ProfileStageConfigData,
        SurveyStageConfigData,
        GroupChatStageConfigData,
        VoteForLeaderConfigData,
        RevealVotedConfigData,
      ]),
    ),
  },
  strict,
);

export type ExperimentCreationData = Static<typeof ExperimentCreationData>;
