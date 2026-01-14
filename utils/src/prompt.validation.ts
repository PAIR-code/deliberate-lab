/**
 * Prompt item validation schemas.
 *
 * These TypeBox schemas define the structure of prompt items for JSON Schema
 * export and Python type generation.
 */
import {Type, type Static} from '@sinclair/typebox';
import {ShuffleConfigData} from './variables.validation';
import {ConditionSchema} from './utils/condition.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// Enums
// ****************************************************************************

/** Prompt item type enum matching PromptItemType */
export const PromptItemTypeData = Type.Union(
  [
    Type.Literal('TEXT'),
    Type.Literal('PROFILE_INFO'),
    Type.Literal('PROFILE_CONTEXT'),
    Type.Literal('STAGE_CONTEXT'),
    Type.Literal('GROUP'),
  ],
  {$id: 'PromptItemType'},
);

// ****************************************************************************
// Prompt items
// ****************************************************************************

/** Base prompt item fields */
const BasePromptItemFields = {
  condition: Type.Optional(ConditionSchema),
};

/** Text prompt item */
export const TextPromptItemData = Type.Object(
  {
    type: Type.Literal('TEXT'),
    text: Type.String(),
    ...BasePromptItemFields,
  },
  {$id: 'TextPromptItem', ...strict},
);

/** Profile info prompt item */
export const ProfileInfoPromptItemData = Type.Object(
  {
    type: Type.Literal('PROFILE_INFO'),
    ...BasePromptItemFields,
  },
  {$id: 'ProfileInfoPromptItem', ...strict},
);

/** Profile context prompt item */
export const ProfileContextPromptItemData = Type.Object(
  {
    type: Type.Literal('PROFILE_CONTEXT'),
    ...BasePromptItemFields,
  },
  {$id: 'ProfileContextPromptItem', ...strict},
);

/** Stage context prompt item */
export const StageContextPromptItemData = Type.Object(
  {
    type: Type.Literal('STAGE_CONTEXT'),
    stageId: Type.String(),
    includePrimaryText: Type.Boolean(),
    includeInfoText: Type.Boolean(),
    includeHelpText: Type.Boolean(),
    includeStageDisplay: Type.Boolean(),
    includeParticipantAnswers: Type.Boolean(),
    ...BasePromptItemFields,
  },
  {$id: 'StageContextPromptItem', ...strict},
);

/** Prompt item group (recursive) */
export const PromptItemGroupData: ReturnType<typeof Type.Object> = Type.Object(
  {
    type: Type.Literal('GROUP'),
    title: Type.String(),
    items: Type.Array(
      Type.Union([
        TextPromptItemData,
        ProfileInfoPromptItemData,
        ProfileContextPromptItemData,
        StageContextPromptItemData,
        Type.Unsafe<Static<typeof PromptItemGroupData>>({$ref: '#'}),
      ]),
    ),
    shuffleConfig: Type.Optional(ShuffleConfigData),
    ...BasePromptItemFields,
  },
  {$id: 'PromptItemGroup', ...strict},
);

/** Union of all prompt item types */
export const PromptItemData = Type.Union([
  TextPromptItemData,
  ProfileInfoPromptItemData,
  ProfileContextPromptItemData,
  StageContextPromptItemData,
  PromptItemGroupData,
]);
