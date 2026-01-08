import {
  ConditionOperator,
  ComparisonOperator,
  AggregationOperator,
  ConditionGroup,
  ComparisonCondition,
  AggregationCondition,
  ConditionTargetReference,
  createConditionGroup,
  createComparisonCondition,
  createAggregationCondition,
  evaluateCondition,
  getComparisonOperatorLabel,
  getConditionOperatorLabel,
  extractConditionDependencies,
  extractMultipleConditionDependencies,
  getConditionTargetKey,
  parseConditionTargetKey,
  hasAggregationConditions,
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

  describe('createAggregationCondition', () => {
    test('creates aggregation condition with default values', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage1',
        questionId: 'q1',
      };
      const condition = createAggregationCondition(target);
      expect(condition).toEqual({
        id: 'test-id',
        type: 'aggregation',
        target,
        aggregator: AggregationOperator.ANY,
        operator: ComparisonOperator.EQUALS,
        value: '',
      });
    });

    test('creates aggregation condition with specified values', () => {
      const target: ConditionTargetReference = {
        stageId: 'stage2',
        questionId: 'q2',
      };
      const condition = createAggregationCondition(
        target,
        AggregationOperator.COUNT,
        ComparisonOperator.GREATER_THAN_OR_EQUAL,
        3,
      );
      expect(condition).toEqual({
        id: 'test-id',
        type: 'aggregation',
        target,
        aggregator: AggregationOperator.COUNT,
        operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
        value: 3,
      });
    });
  });

  describe('evaluateCondition', () => {
    // Flat target values for comparison tests
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

    describe('aggregation conditions', () => {
      // Aggregated values: arrays of values for each target key
      // Represents 4 participants with different values
      const allValues: Record<string, unknown[]> = {
        'stage1::q1': ['yes', 'yes', 'no', 'yes'], // 3 yes, 1 no
        'stage1::q2': [5, 10, 15, 20], // sum=50, avg=12.5
        'stage1::q3': ['a', 'b', 'c'], // only 3 values (p4 didn't answer)
      };

      // Empty values for testing empty scenarios
      const emptyValues: Record<string, unknown[]> = {};

      describe('ANY aggregator', () => {
        test('returns true if any value matches', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.ANY,
            operator: ComparisonOperator.EQUALS,
            value: 'yes',
          };
          // 3 out of 4 values are 'yes'
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('returns false if no value matches', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.ANY,
            operator: ComparisonOperator.EQUALS,
            value: 'maybe',
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('returns false for empty values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.ANY,
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          };
          expect(evaluateCondition(condition, {}, emptyValues)).toBe(false);
        });

        test('works with numeric comparisons', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.ANY,
            operator: ComparisonOperator.GREATER_THAN,
            value: 15,
          };
          // value 20 is > 15
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);

          condition.value = 25;
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });
      });

      describe('ALL aggregator', () => {
        test('returns true if all values match', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.ALL,
            operator: ComparisonOperator.GREATER_THAN,
            value: 0,
          };
          // All values (5, 10, 15, 20) are > 0
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('returns false if any value does not match', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.ALL,
            operator: ComparisonOperator.EQUALS,
            value: 'yes',
          };
          // one value is 'no', so not all are 'yes'
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('returns false for empty values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.ALL,
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          };
          expect(evaluateCondition(condition, {}, emptyValues)).toBe(false);
        });
      });

      describe('NONE aggregator', () => {
        test('returns true if no value matches', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.NONE,
            operator: ComparisonOperator.EQUALS,
            value: 'maybe',
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('returns false if any value matches', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.NONE,
            operator: ComparisonOperator.EQUALS,
            value: 'yes',
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('returns false for empty values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.NONE,
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          };
          expect(evaluateCondition(condition, {}, emptyValues)).toBe(false);
        });
      });

      describe('COUNT aggregator', () => {
        test('counts all non-null values without filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.COUNT,
            operator: ComparisonOperator.EQUALS,
            value: 4,
          };
          // All 4 values for q1
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);

          condition.value = 3;
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('counts filtered values with filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.COUNT,
            operator: ComparisonOperator.EQUALS,
            value: 3,
            filterComparison: {
              operator: ComparisonOperator.EQUALS,
              value: 'yes',
            },
          };
          // 3 values are 'yes'
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('count with GREATER_THAN_OR_EQUAL comparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.COUNT,
            operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
            value: 3,
            filterComparison: {
              operator: ComparisonOperator.EQUALS,
              value: 'yes',
            },
          };
          // 3 values are 'yes', >= 3
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);

          condition.value = 4;
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('count with numeric filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.COUNT,
            operator: ComparisonOperator.EQUALS,
            value: 2,
            filterComparison: {
              operator: ComparisonOperator.GREATER_THAN,
              value: 10,
            },
          };
          // Values > 10: 15, 20 = 2 values
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('returns false for empty values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q1'},
            aggregator: AggregationOperator.COUNT,
            operator: ComparisonOperator.EQUALS,
            value: 0,
          };
          // No values to count
          expect(evaluateCondition(condition, {}, emptyValues)).toBe(false);
        });
      });

      describe('SUM aggregator', () => {
        test('sums all values without filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.SUM,
            operator: ComparisonOperator.EQUALS,
            value: 50, // 5 + 10 + 15 + 20 = 50
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('sums filtered values with filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.SUM,
            operator: ComparisonOperator.EQUALS,
            value: 35, // 15 + 20 = 35 (values > 10)
            filterComparison: {
              operator: ComparisonOperator.GREATER_THAN,
              value: 10,
            },
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('sum with GREATER_THAN comparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.SUM,
            operator: ComparisonOperator.GREATER_THAN,
            value: 40,
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);

          condition.value = 50;
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('returns false for empty values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.SUM,
            operator: ComparisonOperator.EQUALS,
            value: 0,
          };
          expect(evaluateCondition(condition, {}, emptyValues)).toBe(false);
        });
      });

      describe('AVERAGE aggregator', () => {
        test('averages all values without filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.AVERAGE,
            operator: ComparisonOperator.EQUALS,
            value: 12.5, // (5 + 10 + 15 + 20) / 4 = 12.5
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('averages filtered values with filterComparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.AVERAGE,
            operator: ComparisonOperator.EQUALS,
            value: 17.5, // (15 + 20) / 2 = 17.5 (values > 10)
            filterComparison: {
              operator: ComparisonOperator.GREATER_THAN,
              value: 10,
            },
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);
        });

        test('average with GREATER_THAN_OR_EQUAL comparison', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.AVERAGE,
            operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
            value: 12.5,
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(true);

          condition.value = 13;
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });

        test('returns false for empty values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.AVERAGE,
            operator: ComparisonOperator.EQUALS,
            value: 0,
          };
          expect(evaluateCondition(condition, {}, emptyValues)).toBe(false);
        });

        test('returns false when filter leaves no values', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'stage1', questionId: 'q2'},
            aggregator: AggregationOperator.AVERAGE,
            operator: ComparisonOperator.EQUALS,
            value: 0,
            filterComparison: {
              operator: ComparisonOperator.GREATER_THAN,
              value: 100, // No values > 100
            },
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });
      });

      describe('aggregation with missing target', () => {
        test('returns false for non-existent target', () => {
          const condition: AggregationCondition = {
            id: '1',
            type: 'aggregation',
            target: {stageId: 'nonexistent', questionId: 'q1'},
            aggregator: AggregationOperator.ANY,
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          };
          expect(evaluateCondition(condition, {}, allValues)).toBe(false);
        });
      });

      describe('aggregation in condition groups', () => {
        test('combines aggregation conditions', () => {
          const group: ConditionGroup = {
            id: '1',
            type: 'group',
            operator: ConditionOperator.AND,
            conditions: [
              {
                id: '2',
                type: 'aggregation',
                target: {stageId: 'stage1', questionId: 'q1'},
                aggregator: AggregationOperator.COUNT,
                operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                value: 3,
                filterComparison: {
                  operator: ComparisonOperator.EQUALS,
                  value: 'yes',
                },
              },
              {
                id: '3',
                type: 'aggregation',
                target: {stageId: 'stage1', questionId: 'q2'},
                aggregator: AggregationOperator.AVERAGE,
                operator: ComparisonOperator.GREATER_THAN,
                value: 10,
              },
            ],
          };
          // 3 'yes' values >= 3, and average 12.5 > 10
          expect(evaluateCondition(group, {}, allValues)).toBe(true);
        });

        test('OR group with aggregation conditions', () => {
          const group: ConditionGroup = {
            id: '1',
            type: 'group',
            operator: ConditionOperator.OR,
            conditions: [
              {
                id: '2',
                type: 'aggregation',
                target: {stageId: 'stage1', questionId: 'q1'},
                aggregator: AggregationOperator.ALL,
                operator: ComparisonOperator.EQUALS,
                value: 'yes', // false - not all are 'yes'
              },
              {
                id: '3',
                type: 'aggregation',
                target: {stageId: 'stage1', questionId: 'q2'},
                aggregator: AggregationOperator.SUM,
                operator: ComparisonOperator.EQUALS,
                value: 50, // true - sum is 50
              },
            ],
          };
          expect(evaluateCondition(group, {}, allValues)).toBe(true);
        });
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

    test('extracts single dependency from aggregation condition', () => {
      const condition: AggregationCondition = {
        id: '1',
        type: 'aggregation',
        target: {stageId: 'stage1', questionId: 'q1'},
        aggregator: AggregationOperator.COUNT,
        operator: ComparisonOperator.GREATER_THAN,
        value: 3,
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

  describe('hasAggregationConditions', () => {
    test('returns false for undefined condition', () => {
      expect(hasAggregationConditions(undefined)).toBe(false);
    });

    test('returns false for comparison condition', () => {
      const condition: ComparisonCondition = {
        id: '1',
        type: 'comparison',
        target: {stageId: 'stage1', questionId: 'q1'},
        operator: ComparisonOperator.EQUALS,
        value: 'test',
      };
      expect(hasAggregationConditions(condition)).toBe(false);
    });

    test('returns true for aggregation condition', () => {
      const condition: AggregationCondition = {
        id: '1',
        type: 'aggregation',
        target: {stageId: 'stage1', questionId: 'q1'},
        aggregator: AggregationOperator.COUNT,
        operator: ComparisonOperator.GREATER_THAN,
        value: 3,
      };
      expect(hasAggregationConditions(condition)).toBe(true);
    });

    test('returns false for group with only comparison conditions', () => {
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
      expect(hasAggregationConditions(group)).toBe(false);
    });

    test('returns true for group containing aggregation condition', () => {
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
            type: 'aggregation',
            target: {stageId: 'stage2', questionId: 'q2'},
            aggregator: AggregationOperator.ANY,
            operator: ComparisonOperator.EQUALS,
            value: 'test',
          },
        ],
      };
      expect(hasAggregationConditions(group)).toBe(true);
    });

    test('returns true for nested group containing aggregation condition', () => {
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
                type: 'aggregation',
                target: {stageId: 'stage2', questionId: 'q2'},
                aggregator: AggregationOperator.SUM,
                operator: ComparisonOperator.GREATER_THAN,
                value: 100,
              },
            ],
          },
        ],
      };
      expect(hasAggregationConditions(nestedGroup)).toBe(true);
    });

    test('returns false for empty group', () => {
      const group: ConditionGroup = {
        id: '1',
        type: 'group',
        operator: ConditionOperator.AND,
        conditions: [],
      };
      expect(hasAggregationConditions(group)).toBe(false);
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
