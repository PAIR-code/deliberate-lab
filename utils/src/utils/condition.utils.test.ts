import {
  getConditionDependencyValues,
  getConditionDependencyValuesWithCurrentStage,
  evaluateConditionWithStageAnswers,
  filterByCondition,
} from './condition.utils';
import {
  ComparisonOperator,
  ConditionOperator,
  Condition,
  ComparisonCondition,
  ConditionGroup,
  ConditionTargetReference,
} from './condition';
import {StageKind, StageParticipantAnswer} from '../stages/stage';
import {
  SurveyStageParticipantAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyQuestionKind,
  SurveyAnswer,
} from '../stages/survey_stage';

// Helper to create SurveyStageParticipantAnswer with proper types
function createSurveyStageAnswer(
  stageId: string,
  answerMap: Record<string, SurveyAnswer>,
): SurveyStageParticipantAnswer {
  return {
    id: stageId,
    kind: StageKind.SURVEY,
    answerMap,
  };
}

// Helper to create SurveyPerParticipantStageParticipantAnswer with proper types
function createPerParticipantStageAnswer(
  stageId: string,
  answerMap: Record<string, Record<string, SurveyAnswer>>,
): SurveyPerParticipantStageParticipantAnswer {
  return {
    id: stageId,
    kind: StageKind.SURVEY_PER_PARTICIPANT,
    answerMap,
  };
}

describe('condition.utils', () => {
  describe('getConditionDependencyValues', () => {
    describe('with Survey stage answers', () => {
      test('extracts text answer values', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'hello world',
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({'stage1::q1': 'hello world'});
      });

      test('extracts check answer values', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {id: 'q1', kind: SurveyQuestionKind.CHECK, isChecked: true},
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({'stage1::q1': true});
      });

      test('extracts multiple choice answer values', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.MULTIPLE_CHOICE,
              choiceId: 'option-a',
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({'stage1::q1': 'option-a'});
      });

      test('extracts scale answer values', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 7},
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({'stage1::q1': 7});
      });

      test('handles multiple dependencies from same stage', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'answer1',
            },
            q2: {id: 'q2', kind: SurveyQuestionKind.SCALE, value: 5},
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
          {stageId: 'stage1', questionId: 'q2'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({
          'stage1::q1': 'answer1',
          'stage1::q2': 5,
        });
      });

      test('handles dependencies from multiple stages', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'from stage1',
            },
          }),
          stage2: createSurveyStageAnswer('stage2', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'from stage2',
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
          {stageId: 'stage2', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({
          'stage1::q1': 'from stage1',
          'stage2::q1': 'from stage2',
        });
      });

      test('skips missing stages', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'exists',
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
          {stageId: 'nonexistent', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({'stage1::q1': 'exists'});
      });

      test('skips missing questions', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'exists',
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
          {stageId: 'stage1', questionId: 'nonexistent'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({'stage1::q1': 'exists'});
      });

      test('returns empty object for empty dependencies', () => {
        const stageAnswers: Record<string, SurveyStageParticipantAnswer> = {
          stage1: createSurveyStageAnswer('stage1', {
            q1: {
              id: 'q1',
              kind: SurveyQuestionKind.TEXT,
              answer: 'exists',
            },
          }),
        };

        const result = getConditionDependencyValues([], stageAnswers);
        expect(result).toEqual({});
      });
    });

    describe('with SurveyPerParticipant stage answers', () => {
      test('extracts answer for specific target participant', () => {
        const stageAnswers: Record<
          string,
          SurveyPerParticipantStageParticipantAnswer
        > = {
          stage1: createPerParticipantStageAnswer('stage1', {
            q1: {
              participant1: {
                id: 'q1',
                kind: SurveyQuestionKind.SCALE,
                value: 8,
              },
              participant2: {
                id: 'q1',
                kind: SurveyQuestionKind.SCALE,
                value: 3,
              },
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(
          dependencies,
          stageAnswers,
          'participant1',
        );
        expect(result).toEqual({'stage1::q1': 8});
      });

      test('returns empty if no targetParticipantId provided', () => {
        const stageAnswers: Record<
          string,
          SurveyPerParticipantStageParticipantAnswer
        > = {
          stage1: createPerParticipantStageAnswer('stage1', {
            q1: {
              participant1: {
                id: 'q1',
                kind: SurveyQuestionKind.SCALE,
                value: 8,
              },
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(dependencies, stageAnswers);
        expect(result).toEqual({});
      });

      test('skips if participant not found in answer map', () => {
        const stageAnswers: Record<
          string,
          SurveyPerParticipantStageParticipantAnswer
        > = {
          stage1: createPerParticipantStageAnswer('stage1', {
            q1: {
              participant1: {
                id: 'q1',
                kind: SurveyQuestionKind.SCALE,
                value: 8,
              },
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'stage1', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(
          dependencies,
          stageAnswers,
          'nonexistent-participant',
        );
        expect(result).toEqual({});
      });
    });

    describe('with mixed stage types', () => {
      test('handles both Survey and SurveyPerParticipant stages', () => {
        const stageAnswers: Record<string, StageParticipantAnswer> = {
          survey: createSurveyStageAnswer('survey', {
            q1: {id: 'q1', kind: SurveyQuestionKind.TEXT, answer: 'text'},
          }),
          perParticipant: createPerParticipantStageAnswer('perParticipant', {
            q1: {
              participant1: {
                id: 'q1',
                kind: SurveyQuestionKind.SCALE,
                value: 5,
              },
            },
          }),
        };
        const dependencies: ConditionTargetReference[] = [
          {stageId: 'survey', questionId: 'q1'},
          {stageId: 'perParticipant', questionId: 'q1'},
        ];

        const result = getConditionDependencyValues(
          dependencies,
          stageAnswers,
          'participant1',
        );
        expect(result).toEqual({
          'survey::q1': 'text',
          'perParticipant::q1': 5,
        });
      });
    });
  });

  describe('getConditionDependencyValuesWithCurrentStage', () => {
    test('uses current stage answers for matching stageId', () => {
      const currentStageAnswers: Record<string, SurveyAnswer> = {
        q1: {id: 'q1', kind: SurveyQuestionKind.TEXT, answer: 'current answer'},
        q2: {id: 'q2', kind: SurveyQuestionKind.SCALE, value: 7},
      };
      const dependencies: ConditionTargetReference[] = [
        {stageId: 'current-stage', questionId: 'q1'},
        {stageId: 'current-stage', questionId: 'q2'},
      ];

      const result = getConditionDependencyValuesWithCurrentStage(
        dependencies,
        'current-stage',
        currentStageAnswers,
      );
      expect(result).toEqual({
        'current-stage::q1': 'current answer',
        'current-stage::q2': 7,
      });
    });

    test('uses persisted answers for other stages', () => {
      const currentStageAnswers: Record<string, SurveyAnswer> = {
        q1: {id: 'q1', kind: SurveyQuestionKind.TEXT, answer: 'current'},
      };
      const allStageAnswers: Record<string, SurveyStageParticipantAnswer> = {
        'other-stage': createSurveyStageAnswer('other-stage', {
          q1: {id: 'q1', kind: SurveyQuestionKind.TEXT, answer: 'persisted'},
        }),
      };
      const dependencies: ConditionTargetReference[] = [
        {stageId: 'current-stage', questionId: 'q1'},
        {stageId: 'other-stage', questionId: 'q1'},
      ];

      const result = getConditionDependencyValuesWithCurrentStage(
        dependencies,
        'current-stage',
        currentStageAnswers,
        allStageAnswers,
      );
      expect(result).toEqual({
        'current-stage::q1': 'current',
        'other-stage::q1': 'persisted',
      });
    });

    test('skips missing current stage answers', () => {
      const currentStageAnswers: Record<string, SurveyAnswer> = {};
      const dependencies: ConditionTargetReference[] = [
        {stageId: 'current-stage', questionId: 'q1'},
      ];

      const result = getConditionDependencyValuesWithCurrentStage(
        dependencies,
        'current-stage',
        currentStageAnswers,
      );
      expect(result).toEqual({});
    });

    test('handles undefined allStageAnswers', () => {
      const currentStageAnswers: Record<string, SurveyAnswer> = {
        q1: {id: 'q1', kind: SurveyQuestionKind.TEXT, answer: 'current'},
      };
      const dependencies: ConditionTargetReference[] = [
        {stageId: 'current-stage', questionId: 'q1'},
        {stageId: 'other-stage', questionId: 'q1'},
      ];

      const result = getConditionDependencyValuesWithCurrentStage(
        dependencies,
        'current-stage',
        currentStageAnswers,
        undefined,
      );
      // Only current stage answer is included since allStageAnswers is undefined
      expect(result).toEqual({'current-stage::q1': 'current'});
    });
  });

  describe('evaluateConditionWithStageAnswers', () => {
    test('returns true for undefined condition', () => {
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 5},
        }),
      };

      expect(evaluateConditionWithStageAnswers(undefined, stageAnswers)).toBe(
        true,
      );
    });

    test('evaluates simple comparison condition', () => {
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 8},
        }),
      };
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN,
        value: 5,
      };

      expect(evaluateConditionWithStageAnswers(condition, stageAnswers)).toBe(
        true,
      );

      condition.value = 10;
      expect(evaluateConditionWithStageAnswers(condition, stageAnswers)).toBe(
        false,
      );
    });

    test('evaluates condition group with AND', () => {
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 8},
          q2: {
            id: 'q2',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'yes',
          },
        }),
      };
      const condition: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [
          {
            id: '2',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q1'},
            operator: ComparisonOperator.GREATER_THAN,
            value: 5,
          },
          {
            id: '3',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q2'},
            operator: ComparisonOperator.EQUALS,
            value: 'yes',
          },
        ],
      };

      expect(evaluateConditionWithStageAnswers(condition, stageAnswers)).toBe(
        true,
      );
    });

    test('evaluates condition group with OR', () => {
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 3}, // fails > 5
          q2: {
            id: 'q2',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'yes',
          }, // passes
        }),
      };
      const condition: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.OR,
        conditions: [
          {
            id: '2',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q1'},
            operator: ComparisonOperator.GREATER_THAN,
            value: 5,
          },
          {
            id: '3',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q2'},
            operator: ComparisonOperator.EQUALS,
            value: 'yes',
          },
        ],
      };

      expect(evaluateConditionWithStageAnswers(condition, stageAnswers)).toBe(
        true,
      );
    });

    test('returns false when answer is missing', () => {
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {}),
      };
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.EQUALS,
        value: 'test',
      };

      expect(evaluateConditionWithStageAnswers(condition, stageAnswers)).toBe(
        false,
      );
    });

    test('evaluates with targetParticipantId for per-participant stages', () => {
      const stageAnswers: Record<
        string,
        SurveyPerParticipantStageParticipantAnswer
      > = {
        stage1: createPerParticipantStageAnswer('stage1', {
          q1: {
            participant1: {
              id: 'q1',
              kind: SurveyQuestionKind.SCALE,
              value: 8,
            },
            participant2: {
              id: 'q1',
              kind: SurveyQuestionKind.SCALE,
              value: 2,
            },
          },
        }),
      };
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN,
        value: 5,
      };

      expect(
        evaluateConditionWithStageAnswers(
          condition,
          stageAnswers,
          'participant1',
        ),
      ).toBe(true);
      expect(
        evaluateConditionWithStageAnswers(
          condition,
          stageAnswers,
          'participant2',
        ),
      ).toBe(false);
    });
  });

  describe('filterByCondition', () => {
    interface TestItem {
      id: string;
      name: string;
      condition?: Condition;
    }

    test('returns all items when none have conditions', () => {
      const items: TestItem[] = [
        {id: '1', name: 'item1'},
        {id: '2', name: 'item2'},
        {id: '3', name: 'item3'},
      ];
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 5},
        }),
      };

      const result = filterByCondition(items, stageAnswers);
      expect(result).toEqual(items);
    });

    test('filters items with failing conditions', () => {
      const passingCondition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN,
        value: 3,
      };
      const failingCondition: ComparisonCondition = {
        id: '2',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.LESS_THAN,
        value: 3,
      };

      const items: TestItem[] = [
        {id: '1', name: 'passes', condition: passingCondition},
        {id: '2', name: 'fails', condition: failingCondition},
        {id: '3', name: 'no condition'},
      ];
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 5},
        }),
      };

      const result = filterByCondition(items, stageAnswers);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['1', '3']);
    });

    test('handles empty items array', () => {
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 5},
        }),
      };

      const result = filterByCondition([], stageAnswers);
      expect(result).toEqual([]);
    });

    test('filters with complex condition groups', () => {
      const complexCondition: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [
          {
            id: '2',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q1'},
            operator: ComparisonOperator.GREATER_THAN,
            value: 3,
          },
          {
            id: '3',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q2'},
            operator: ComparisonOperator.EQUALS,
            value: 'yes',
          },
        ],
      };

      const items: TestItem[] = [
        {id: '1', name: 'complex', condition: complexCondition},
        {id: '2', name: 'no condition'},
      ];

      // Both conditions pass
      let stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 5},
          q2: {
            id: 'q2',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'yes',
          },
        }),
      };
      let result = filterByCondition(items, stageAnswers);
      expect(result.map((i) => i.id)).toEqual(['1', '2']);

      // One condition fails
      stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {
          q1: {id: 'q1', kind: SurveyQuestionKind.SCALE, value: 5},
          q2: {
            id: 'q2',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'no',
          },
        }),
      };
      result = filterByCondition(items, stageAnswers);
      expect(result.map((i) => i.id)).toEqual(['2']);
    });

    test('works with targetParticipantId', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN,
        value: 5,
      };

      const items: TestItem[] = [
        {id: '1', name: 'conditional', condition},
        {id: '2', name: 'always'},
      ];
      const stageAnswers: Record<
        string,
        SurveyPerParticipantStageParticipantAnswer
      > = {
        stage1: createPerParticipantStageAnswer('stage1', {
          q1: {
            participant1: {
              id: 'q1',
              kind: SurveyQuestionKind.SCALE,
              value: 8,
            },
            participant2: {
              id: 'q1',
              kind: SurveyQuestionKind.SCALE,
              value: 2,
            },
          },
        }),
      };

      // participant1 passes the condition
      let result = filterByCondition(items, stageAnswers, 'participant1');
      expect(result.map((i) => i.id)).toEqual(['1', '2']);

      // participant2 fails the condition
      result = filterByCondition(items, stageAnswers, 'participant2');
      expect(result.map((i) => i.id)).toEqual(['2']);
    });

    test('preserves item order', () => {
      const items: TestItem[] = [
        {id: 'a', name: 'first'},
        {id: 'b', name: 'second'},
        {id: 'c', name: 'third'},
        {id: 'd', name: 'fourth'},
      ];
      const stageAnswers = {
        stage1: createSurveyStageAnswer('stage1', {}),
      };

      const result = filterByCondition(items, stageAnswers);
      expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    });
  });
});
