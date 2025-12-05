import {
  ConditionOperator,
  ComparisonOperator,
  ConditionGroup,
  ComparisonCondition,
  ConditionTargetReference,
  createConditionGroup,
  createComparisonCondition,
  evaluateCondition,
  getComparisonOperatorLabel,
  getConditionOperatorLabel,
  extractConditionDependencies,
  extractMultipleConditionDependencies,
  getConditionTargetKey,
  parseConditionTargetKey,
} from './condition';

// Mock generateId for predictable test results
jest.mock('../shared', () => ({
  generateId: jest.fn(() => 'test-id'),
}));

describe('condition utilities', () => {
  describe('createConditionGroup', () => {
    test('creates condition group with default AND operator', () => {
      const group = createConditionGroup();
      expect(group).toEqual({
        id: 'test-id',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [],
      });
    });

    test('creates condition group with specified OR operator', () => {
      const group = createConditionGroup(ConditionOperator.OR);
      expect(group).toEqual({
        id: 'test-id',
        type: 'group',
        operator: ConditionOperator.OR,
        conditions: [],
      });
    });

    test('creates condition group with initial conditions', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage1',
        questionId: 'q1',
      };
      const condition1 = createComparisonCondition(
        target,
        ComparisonOperator.EQUALS,
        'value1',
      );
      const condition2 = createComparisonCondition(
        target,
        ComparisonOperator.NOT_EQUALS,
        'value2',
      );

      const group = createConditionGroup(ConditionOperator.AND, [
        condition1,
        condition2,
      ]);
      expect(group).toEqual({
        id: 'test-id',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [condition1, condition2],
      });
    });

    test('creates condition group with OR operator and initial conditions', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage1',
        questionId: 'q1',
      };
      const condition = createComparisonCondition(
        target,
        ComparisonOperator.GREATER_THAN,
        10,
      );

      const group = createConditionGroup(ConditionOperator.OR, [condition]);
      expect(group).toEqual({
        id: 'test-id',
        type: 'group',
        operator: ConditionOperator.OR,
        conditions: [condition],
      });
    });
  });

  describe('createComparisonCondition', () => {
    test('creates comparison condition with default values', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage1',
        questionId: 'q1',
      };
      const condition = createComparisonCondition(target);
      expect(condition).toEqual({
        id: 'test-id',
        type: 'comparison',
        target,
        operator: ComparisonOperator.EQUALS,
        value: '',
      });
    });

    test('creates comparison condition with specified values', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage2',
        questionId: 'q2',
      };
      const condition = createComparisonCondition(
        target,
        ComparisonOperator.GREATER_THAN,
        10,
      );
      expect(condition).toEqual({
        id: 'test-id',
        type: 'comparison',
        target,
        operator: ComparisonOperator.GREATER_THAN,
        value: 10,
      });
    });
  });

  describe('evaluateCondition', () => {
    const targetValues = {
      'stage1::q1': 'apple',
      'stage1::q2': 5,
      'stage1::q3': true,
      'stage2::q1': 'banana pie',
      'stage2::q2': 10,
    };

    describe('undefined condition', () => {
      test('returns true for undefined condition', () => {
        expect(evaluateCondition(undefined, targetValues)).toBe(true);
      });
    });

    describe('comparison conditions', () => {
      test('evaluates EQUALS operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q1'},
          operator: ComparisonOperator.EQUALS,
          value: 'apple',
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 'orange';
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates NOT_EQUALS operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q1'},
          operator: ComparisonOperator.NOT_EQUALS,
          value: 'orange',
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 'apple';
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates GREATER_THAN operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q2'},
          operator: ComparisonOperator.GREATER_THAN,
          value: 3,
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 5;
        expect(evaluateCondition(condition, targetValues)).toBe(false);

        condition.value = 10;
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates GREATER_THAN_OR_EQUAL operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q2'},
          operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
          value: 5,
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 3;
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 10;
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates LESS_THAN operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q2'},
          operator: ComparisonOperator.LESS_THAN,
          value: 10,
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 5;
        expect(evaluateCondition(condition, targetValues)).toBe(false);

        condition.value = 3;
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates LESS_THAN_OR_EQUAL operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q2'},
          operator: ComparisonOperator.LESS_THAN_OR_EQUAL,
          value: 5,
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 10;
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 3;
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates CONTAINS operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage2', questionId: 'q1'},
          operator: ComparisonOperator.CONTAINS,
          value: 'pie',
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 'banana';
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 'apple';
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('evaluates NOT_CONTAINS operator', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage2', questionId: 'q1'},
          operator: ComparisonOperator.NOT_CONTAINS,
          value: 'apple',
        };
        expect(evaluateCondition(condition, targetValues)).toBe(true);

        condition.value = 'pie';
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('returns false for undefined target value', () => {
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'nonexistent', questionId: 'q1'},
          operator: ComparisonOperator.EQUALS,
          value: 'test',
        };
        expect(evaluateCondition(condition, targetValues)).toBe(false);
      });

      test('handles numeric comparisons with string values', () => {
        const stringNumValues = {
          'stage1::q1': '15',
        };
        const condition: ComparisonCondition = {
          id: '1',
          type: 'comparison',
          target: {stageId: 'stage1', questionId: 'q1'},
          operator: ComparisonOperator.GREATER_THAN,
          value: '10',
        };
        expect(evaluateCondition(condition, stringNumValues)).toBe(true);
      });
    });

    describe('condition groups', () => {
      test('evaluates empty group as true', () => {
        const group: ConditionGroup = {
          id: '1',
          type: 'group',
          operator: ConditionOperator.AND,
          conditions: [],
        };
        expect(evaluateCondition(group, targetValues)).toBe(true);
      });

      test('evaluates AND group with all true conditions', () => {
        const group: ConditionGroup = {
          id: '1',
          type: 'group',
          operator: ConditionOperator.AND,
          conditions: [
            {
              id: '2',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q1'},
              operator: ComparisonOperator.EQUALS,
              value: 'apple',
            },
            {
              id: '3',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q2'},
              operator: ComparisonOperator.GREATER_THAN,
              value: 3,
            },
          ],
        };
        expect(evaluateCondition(group, targetValues)).toBe(true);
      });

      test('evaluates AND group with one false condition', () => {
        const group: ConditionGroup = {
          id: '1',
          type: 'group',
          operator: ConditionOperator.AND,
          conditions: [
            {
              id: '2',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q1'},
              operator: ComparisonOperator.EQUALS,
              value: 'apple',
            },
            {
              id: '3',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q2'},
              operator: ComparisonOperator.GREATER_THAN,
              value: 10,
            },
          ],
        };
        expect(evaluateCondition(group, targetValues)).toBe(false);
      });

      test('evaluates OR group with at least one true condition', () => {
        const group: ConditionGroup = {
          id: '1',
          type: 'group',
          operator: ConditionOperator.OR,
          conditions: [
            {
              id: '2',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q1'},
              operator: ComparisonOperator.EQUALS,
              value: 'orange',
            },
            {
              id: '3',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q2'},
              operator: ComparisonOperator.GREATER_THAN,
              value: 3,
            },
          ],
        };
        expect(evaluateCondition(group, targetValues)).toBe(true);
      });

      test('evaluates OR group with all false conditions', () => {
        const group: ConditionGroup = {
          id: '1',
          type: 'group',
          operator: ConditionOperator.OR,
          conditions: [
            {
              id: '2',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q1'},
              operator: ComparisonOperator.EQUALS,
              value: 'orange',
            },
            {
              id: '3',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q2'},
              operator: ComparisonOperator.GREATER_THAN,
              value: 10,
            },
          ],
        };
        expect(evaluateCondition(group, targetValues)).toBe(false);
      });

      test('evaluates nested groups', () => {
        const nestedGroup: ConditionGroup = {
          id: '1',
          type: 'group',
          operator: ConditionOperator.AND,
          conditions: [
            {
              id: '2',
              type: 'group',
              operator: ConditionOperator.OR,
              conditions: [
                {
                  id: '3',
                  type: 'comparison',
                  target: {stageId: 'stage1', questionId: 'q1'},
                  operator: ComparisonOperator.EQUALS,
                  value: 'apple',
                },
                {
                  id: '4',
                  type: 'comparison',
                  target: {stageId: 'stage1', questionId: 'q1'},
                  operator: ComparisonOperator.EQUALS,
                  value: 'orange',
                },
              ],
            },
            {
              id: '5',
              type: 'comparison',
              target: {stageId: 'stage1', questionId: 'q2'},
              operator: ComparisonOperator.GREATER_THAN,
              value: 3,
            },
          ],
        };
        expect(evaluateCondition(nestedGroup, targetValues)).toBe(true);
      });
    });
  });

  describe('getComparisonOperatorLabel', () => {
    test('returns correct labels for all operators', () => {
      expect(getComparisonOperatorLabel(ComparisonOperator.EQUALS)).toBe(
        'equals',
      );
      expect(getComparisonOperatorLabel(ComparisonOperator.NOT_EQUALS)).toBe(
        'not equals',
      );
      expect(getComparisonOperatorLabel(ComparisonOperator.GREATER_THAN)).toBe(
        'greater than',
      );
      expect(
        getComparisonOperatorLabel(ComparisonOperator.GREATER_THAN_OR_EQUAL),
      ).toBe('greater than or equal to');
      expect(getComparisonOperatorLabel(ComparisonOperator.LESS_THAN)).toBe(
        'less than',
      );
      expect(
        getComparisonOperatorLabel(ComparisonOperator.LESS_THAN_OR_EQUAL),
      ).toBe('less than or equal to');
      expect(getComparisonOperatorLabel(ComparisonOperator.CONTAINS)).toBe(
        'contains',
      );
      expect(getComparisonOperatorLabel(ComparisonOperator.NOT_CONTAINS)).toBe(
        'does not contain',
      );
    });

    test('returns operator value for unknown operator', () => {
      expect(getComparisonOperatorLabel('unknown' as ComparisonOperator)).toBe(
        'unknown',
      );
    });
  });

  describe('getConditionOperatorLabel', () => {
    test('returns correct labels for all operators', () => {
      expect(getConditionOperatorLabel(ConditionOperator.AND)).toBe('AND');
      expect(getConditionOperatorLabel(ConditionOperator.OR)).toBe('OR');
    });

    test('returns operator value for unknown operator', () => {
      expect(getConditionOperatorLabel('unknown' as ConditionOperator)).toBe(
        'unknown',
      );
    });
  });

  describe('extractConditionDependencies', () => {
    test('returns empty array for undefined condition', () => {
      expect(extractConditionDependencies(undefined)).toEqual([]);
    });

    test('extracts single dependency from comparison condition', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.EQUALS,
        value: 'test',
      };
      expect(extractConditionDependencies(condition)).toEqual([
        {stageId: 'stage1', questionId: 'q1'},
      ]);
    });

    test('extracts dependencies from condition group', () => {
      const group: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [
          {
            id: '2',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q1'},
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          },
          {
            id: '3',
            type: 'comparison',
            target: {stageId: 'stage2', questionId: 'q2'},
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          },
        ],
      };
      expect(extractConditionDependencies(group)).toEqual([
        {stageId: 'stage1', questionId: 'q1'},
        {stageId: 'stage2', questionId: 'q2'},
      ]);
    });

    test('deduplicates dependencies', () => {
      const group: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [
          {
            id: '2',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q1'},
            operator: ComparisonOperator.EQUALS,
            value: 'test1',
          },
          {
            id: '3',
            type: 'comparison',
            target: {stageId: 'stage1', questionId: 'q1'},
            operator: ComparisonOperator.NOT_EQUALS,
            value: 'test2',
          },
        ],
      };
      expect(extractConditionDependencies(group)).toEqual([
        {stageId: 'stage1', questionId: 'q1'},
      ]);
    });

    test('extracts dependencies from nested groups', () => {
      const nestedGroup: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [
          {
            id: '2',
            type: 'group',
            operator: ConditionOperator.OR,
            conditions: [
              {
                id: '3',
                type: 'comparison',
                target: {stageId: 'stage1', questionId: 'q1'},
                operator: ComparisonOperator.EQUALS,
                value: 'test',
              },
              {
                id: '4',
                type: 'comparison',
                target: {stageId: 'stage2', questionId: 'q2'},
                operator: ComparisonOperator.EQUALS,
                value: 'test',
              },
            ],
          },
          {
            id: '5',
            type: 'comparison',
            target: {stageId: 'stage3', questionId: 'q3'},
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          },
        ],
      };
      expect(extractConditionDependencies(nestedGroup)).toEqual([
        {stageId: 'stage1', questionId: 'q1'},
        {stageId: 'stage2', questionId: 'q2'},
        {stageId: 'stage3', questionId: 'q3'},
      ]);
    });
  });

  describe('extractMultipleConditionDependencies', () => {
    test('returns empty array for empty conditions array', () => {
      expect(extractMultipleConditionDependencies([])).toEqual([]);
    });

    test('handles undefined conditions in array', () => {
      const conditions = [
        undefined,
        {
          id: '1',
          type: 'comparison' as const,
          target: {stageId: 'stage1', questionId: 'q1'},
          operator: ComparisonOperator.EQUALS,
          value: 'test',
        },
        undefined,
      ];
      expect(extractMultipleConditionDependencies(conditions)).toEqual([
        {stageId: 'stage1', questionId: 'q1'},
      ]);
    });

    test('extracts and deduplicates dependencies from multiple conditions', () => {
      const conditions = [
        {
          id: '1',
          type: 'comparison' as const,
          target: {stageId: 'stage1', questionId: 'q1'},
          operator: ComparisonOperator.EQUALS,
          value: 'test',
        },
        {
          id: '2',
          type: 'group' as const,
          operator: ConditionOperator.AND,
          conditions: [
            {
              id: '3',
              type: 'comparison' as const,
              target: {stageId: 'stage1', questionId: 'q1'},
              operator: ComparisonOperator.NOT_EQUALS,
              value: 'test',
            },
            {
              id: '4',
              type: 'comparison' as const,
              target: {stageId: 'stage2', questionId: 'q2'},
              operator: ComparisonOperator.EQUALS,
              value: 'test',
            },
          ],
        },
        {
          id: '5',
          type: 'comparison' as const,
          target: {stageId: 'stage3', questionId: 'q3'},
          operator: ComparisonOperator.EQUALS,
          value: 'test',
        },
      ];
      expect(extractMultipleConditionDependencies(conditions)).toEqual([
        {stageId: 'stage1', questionId: 'q1'},
        {stageId: 'stage2', questionId: 'q2'},
        {stageId: 'stage3', questionId: 'q3'},
      ]);
    });
  });

  describe('getConditionTargetKey', () => {
    test('builds key from stage and question IDs', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage1',
        questionId: 'q1',
      };
      expect(getConditionTargetKey(target)).toBe('stage1::q1');
    });

    test('handles IDs with special characters', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage-with-dashes',
        questionId: 'question_with_underscores',
      };
      expect(getConditionTargetKey(target)).toBe(
        'stage-with-dashes::question_with_underscores',
      );
    });

    test('handles empty string IDs', () => {
      const target: ConditionTargetReference = {
        stageId: '',
        questionId: '',
      };
      expect(getConditionTargetKey(target)).toBe('::');
    });
  });

  describe('parseConditionTargetKey', () => {
    test('parses key back to stage and question IDs', () => {
      const result = parseConditionTargetKey('stage1::q1');
      expect(result).toEqual({
        stageId: 'stage1',
        questionId: 'q1',
      });
    });

    test('handles IDs with special characters', () => {
      const result = parseConditionTargetKey(
        'stage-with-dashes::question_with_underscores',
      );
      expect(result).toEqual({
        stageId: 'stage-with-dashes',
        questionId: 'question_with_underscores',
      });
    });

    test('handles empty string IDs', () => {
      const result = parseConditionTargetKey('::');
      expect(result).toEqual({
        stageId: '',
        questionId: '',
      });
    });

    test('roundtrip: getConditionTargetKey and parseConditionTargetKey', () => {
      const original: ConditionTargetReference = {
        stageId: 'my-stage-123',
        questionId: 'question_abc',
      };
      const key = getConditionTargetKey(original);
      const parsed = parseConditionTargetKey(key);
      expect(parsed).toEqual(original);
    });
  });

  describe('evaluateCondition edge cases', () => {
    test('handles boolean target values', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.EQUALS,
        value: true,
      };
      expect(evaluateCondition(condition, {'stage1::q1': true})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': false})).toBe(false);

      condition.value = false;
      expect(evaluateCondition(condition, {'stage1::q1': false})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': true})).toBe(false);
    });

    test('handles empty string values', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.EQUALS,
        value: '',
      };
      expect(evaluateCondition(condition, {'stage1::q1': ''})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': 'notempty'})).toBe(
        false,
      );
    });

    test('handles zero value comparisons', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.EQUALS,
        value: 0,
      };
      expect(evaluateCondition(condition, {'stage1::q1': 0})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': 1})).toBe(false);
    });

    test('GREATER_THAN with zero boundary', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN,
        value: 0,
      };
      expect(evaluateCondition(condition, {'stage1::q1': 1})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': 0})).toBe(false);
      expect(evaluateCondition(condition, {'stage1::q1': -1})).toBe(false);
    });

    test('LESS_THAN with zero boundary', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.LESS_THAN,
        value: 0,
      };
      expect(evaluateCondition(condition, {'stage1::q1': -1})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': 0})).toBe(false);
      expect(evaluateCondition(condition, {'stage1::q1': 1})).toBe(false);
    });

    test('CONTAINS with empty search string', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.CONTAINS,
        value: '',
      };
      // Empty string is contained in all strings
      expect(evaluateCondition(condition, {'stage1::q1': 'anything'})).toBe(
        true,
      );
      expect(evaluateCondition(condition, {'stage1::q1': ''})).toBe(true);
    });

    test('NOT_CONTAINS with empty search string', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.NOT_CONTAINS,
        value: '',
      };
      // Empty string is contained in all strings, so NOT_CONTAINS returns false
      expect(evaluateCondition(condition, {'stage1::q1': 'anything'})).toBe(
        false,
      );
    });

    test('numeric comparison with negative numbers', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN,
        value: -5,
      };
      expect(evaluateCondition(condition, {'stage1::q1': -3})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': -5})).toBe(false);
      expect(evaluateCondition(condition, {'stage1::q1': -10})).toBe(false);
    });

    test('numeric comparison with decimal numbers', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
        value: 3.5,
      };
      expect(evaluateCondition(condition, {'stage1::q1': 3.5})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': 4.0})).toBe(true);
      expect(evaluateCondition(condition, {'stage1::q1': 3.4})).toBe(false);
    });

    test('deeply nested condition groups', () => {
      // Three levels deep: AND(OR(AND(comparison, comparison), comparison))
      const deeplyNested: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [
          {
            id: '2',
            type: 'group',
            operator: ConditionOperator.OR,
            conditions: [
              {
                id: '3',
                type: 'group',
                operator: ConditionOperator.AND,
                conditions: [
                  {
                    id: '4',
                    type: 'comparison',
                    target: {stageId: 'stage1', questionId: 'q1'},
                    operator: ComparisonOperator.EQUALS,
                    value: 'a',
                  },
                  {
                    id: '5',
                    type: 'comparison',
                    target: {stageId: 'stage1', questionId: 'q2'},
                    operator: ComparisonOperator.EQUALS,
                    value: 'b',
                  },
                ],
              },
              {
                id: '6',
                type: 'comparison',
                target: {stageId: 'stage1', questionId: 'q3'},
                operator: ComparisonOperator.EQUALS,
                value: 'c',
              },
            ],
          },
        ],
      };

      // Inner AND group is true (q1='a' AND q2='b')
      expect(
        evaluateCondition(deeplyNested, {
          'stage1::q1': 'a',
          'stage1::q2': 'b',
          'stage1::q3': 'x',
        }),
      ).toBe(true);

      // OR alternative is true (q3='c')
      expect(
        evaluateCondition(deeplyNested, {
          'stage1::q1': 'x',
          'stage1::q2': 'x',
          'stage1::q3': 'c',
        }),
      ).toBe(true);

      // Neither path is true
      expect(
        evaluateCondition(deeplyNested, {
          'stage1::q1': 'a',
          'stage1::q2': 'x', // breaks inner AND
          'stage1::q3': 'x', // not 'c'
        }),
      ).toBe(false);
    });
  });
});
