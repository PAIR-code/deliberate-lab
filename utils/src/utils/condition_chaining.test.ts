import {
  ConditionOperator,
  ComparisonOperator,
  ConditionGroup,
  createConditionGroup,
  createComparisonCondition,
  evaluateCondition,
} from './condition';

describe('condition chaining tests', () => {
  describe('chaining multiple conditions', () => {
    test('evaluates AND chain with multiple conditions', () => {
      const group = createConditionGroup(ConditionOperator.AND);

      // Add three conditions to the group
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q1'},
          ComparisonOperator.EQUALS,
          'apple',
        ),
      );
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q2'},
          ComparisonOperator.GREATER_THAN,
          5,
        ),
      );
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q3'},
          ComparisonOperator.CONTAINS,
          'test',
        ),
      );

      // Test when all conditions are true
      const targetValues = {
        'stage1::q1': 'apple',
        'stage1::q2': 10,
        'stage1::q3': 'this is a test string',
      };
      expect(evaluateCondition(group, targetValues)).toBe(true);

      // Test when one condition is false
      targetValues['stage1::q2'] = 3;
      expect(evaluateCondition(group, targetValues)).toBe(false);
    });

    test('evaluates OR chain with multiple conditions', () => {
      const group = createConditionGroup(ConditionOperator.OR);

      // Add three conditions to the group
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q1'},
          ComparisonOperator.EQUALS,
          'apple',
        ),
      );
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q2'},
          ComparisonOperator.GREATER_THAN,
          5,
        ),
      );
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q3'},
          ComparisonOperator.CONTAINS,
          'test',
        ),
      );

      // Test when only one condition is true
      const targetValues = {
        'stage1::q1': 'orange',
        'stage1::q2': 3,
        'stage1::q3': 'this is a test string',
      };
      expect(evaluateCondition(group, targetValues)).toBe(true);

      // Test when all conditions are false
      targetValues['stage1::q3'] = 'no match here';
      expect(evaluateCondition(group, targetValues)).toBe(false);
    });

    test('converts single comparison to group for chaining', () => {
      // Start with a single comparison
      const singleCondition = createComparisonCondition(
        {stageId: 'stage1', questionId: 'q1'},
        ComparisonOperator.EQUALS,
        'apple',
      );

      // Convert to group to enable chaining
      const group = createConditionGroup(ConditionOperator.AND);
      group.conditions.push(singleCondition);

      // Add another condition
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'stage1', questionId: 'q2'},
          ComparisonOperator.GREATER_THAN,
          5,
        ),
      );

      // Verify the group has both conditions
      expect(group.conditions.length).toBe(2);
      expect(group.conditions[0]).toBe(singleCondition);
      expect(group.conditions[1].type).toBe('comparison');
    });

    test('chains conditions across multiple stages', () => {
      const group = createConditionGroup(ConditionOperator.AND);

      // Add conditions from different stages
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'survey1', questionId: 'age'},
          ComparisonOperator.GREATER_THAN_OR_EQUAL,
          18,
        ),
      );
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'survey2', questionId: 'consent'},
          ComparisonOperator.EQUALS,
          true,
        ),
      );
      group.conditions.push(
        createComparisonCondition(
          {stageId: 'profile', questionId: 'country'},
          ComparisonOperator.EQUALS,
          'USA',
        ),
      );

      const targetValues = {
        'survey1::age': 25,
        'survey2::consent': true,
        'profile::country': 'USA',
      };

      expect(evaluateCondition(group, targetValues)).toBe(true);
    });

    test('handles complex chaining with mixed operators', () => {
      const mainGroup = createConditionGroup(ConditionOperator.OR);

      // First OR branch: age > 18 AND country = USA
      const andGroup1 = createConditionGroup(ConditionOperator.AND);
      andGroup1.conditions.push(
        createComparisonCondition(
          {stageId: 'profile', questionId: 'age'},
          ComparisonOperator.GREATER_THAN,
          18,
        ),
      );
      andGroup1.conditions.push(
        createComparisonCondition(
          {stageId: 'profile', questionId: 'country'},
          ComparisonOperator.EQUALS,
          'USA',
        ),
      );
      mainGroup.conditions.push(andGroup1);

      // Second OR branch: role = admin
      mainGroup.conditions.push(
        createComparisonCondition(
          {stageId: 'profile', questionId: 'role'},
          ComparisonOperator.EQUALS,
          'admin',
        ),
      );

      // Test case 1: First branch is true
      let targetValues = {
        'profile::age': 25,
        'profile::country': 'USA',
        'profile::role': 'user',
      };
      expect(evaluateCondition(mainGroup, targetValues)).toBe(true);

      // Test case 2: Only second branch is true
      targetValues = {
        'profile::age': 16,
        'profile::country': 'Canada',
        'profile::role': 'admin',
      };
      expect(evaluateCondition(mainGroup, targetValues)).toBe(true);

      // Test case 3: Neither branch is true
      targetValues = {
        'profile::age': 16,
        'profile::country': 'Canada',
        'profile::role': 'user',
      };
      expect(evaluateCondition(mainGroup, targetValues)).toBe(false);
    });
  });
});
