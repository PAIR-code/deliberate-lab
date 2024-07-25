import { Type, type Static } from '@sinclair/typebox';
import {
  GroupChatStageConfigData,
  InfoConfigData,
  PayoutConfigData,
  ProfileStageConfigData,
  RevealConfigData,
  SurveyStageConfigData,
  TermsOfServiceConfigData,
  VoteForLeaderConfigData,
} from './stages.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Generic experiment or template deletion data */
export const ParticipantCreationData = Type.Object(
  {
    // Discriminate between experiment and template
    experimentId: Type.String({ minLength: 1 }),
    participantData: Type.Optional(Type.Any()),
  },
  strict,
);

export type ParticipantCreationData = Static<typeof ParticipantCreationData>;

/** Participant deletion data */
export const ParticipantDeletionData = Type.Object(
  {
    // ID of the experiment the participant belongs to
    experimentId: Type.String({ minLength: 1 }),
    // ID of the participant to be deleted
    participantId: Type.String({ minLength: 1 }),
  },
  strict,
);

export type ParticipantDeletionData = Static<typeof ParticipantDeletionData>;

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
        publicName: Type.String({ minLength: 1 }),
        description: Type.String(),
        tags: Type.Array(Type.String()),
        group: Type.Optional(Type.String()),
        isLobby: Type.Boolean(),
        numberOfParticipants: Type.Optional(Type.Number({ minimum: 0 })),
        numberOfMaxParticipants: Type.Optional(Type.Number({ minimum: 0 })),
      },
      strict,
    ),

    // Stage config data
    stages: Type.Array(
      Type.Union([
        InfoConfigData,
        TermsOfServiceConfigData,
        ProfileStageConfigData,
        SurveyStageConfigData,
        GroupChatStageConfigData,
        VoteForLeaderConfigData,
        PayoutConfigData,
        RevealConfigData,
      ]),
    ),
  },
  strict,
);

export type ExperimentCreationData = Static<typeof ExperimentCreationData>;
