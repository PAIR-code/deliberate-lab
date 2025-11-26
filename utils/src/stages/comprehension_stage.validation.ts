import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {ComprehensionQuestionKind} from './comprehension_stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {MultipleChoiceItemData} from './survey_stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** TextComprehensionQuestion input validation. */
export const TextComprehensionQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(ComprehensionQuestionKind.TEXT),
    questionTitle: Type.String(),
    correctAnswer: Type.String(),
  },
  strict,
);

/** MultipleChoiceComprehensionQuestion input validation. */
export const MultipleChoiceComprehensionQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(ComprehensionQuestionKind.MULTIPLE_CHOICE),
    questionTitle: Type.String(),
    options: Type.Array(MultipleChoiceItemData),
    correctAnswerId: Type.String(),
  },
  strict,
);

/** ComprehensionQuestion input validation. */
export const ComprehensionQuestionData = Type.Union([
  TextComprehensionQuestionData,
  MultipleChoiceComprehensionQuestionData,
]);

/** ComprehensionStageConfig input validation. */
export const ComprehensionStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.COMPREHENSION),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    questions: Type.Array(ComprehensionQuestionData),
  },
  strict,
);
