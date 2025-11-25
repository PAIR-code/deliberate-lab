import {Type} from '@sinclair/typebox';
import {SeedStrategy, createShuffleConfig} from './utils/random.utils';
import {
  generateVariablesForScope,
  createRandomPermutationVariableConfig,
  createStaticVariableConfig,
  extractVariablesFromVariableConfigs,
} from './variables.utils';
import {VariableConfigType, VariableScope} from './variables';

describe('generateVariablesForScope', () => {
  const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

  afterEach(() => {
    consoleSpy.mockClear();
  });

  it('should validate schema and warn if value does not match (Random Permutation)', () => {
    const config = createRandomPermutationVariableConfig({
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      scope: VariableScope.COHORT,
      definition: {
        name: 'test_var',
        description: '',
        // Schema describes output type (array of numbers)
        schema: Type.Array(Type.Number()),
      },
      shuffleConfig: createShuffleConfig({
        shuffle: true,
        seed: SeedStrategy.COHORT,
      }),
      values: [
        {id: '1', value: JSON.stringify('not a number')}, // INVALID
        {id: '2', value: JSON.stringify(123)}, // VALID
      ],
      numToSelect: 2,
    });

    const result = generateVariablesForScope([config], {
      scope: VariableScope.COHORT,
      experimentId: 'exp',
      cohortId: 'cohort',
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain(
      'Variable "test_var" value does not match its schema definition',
    );

    // It should still generate the value (best effort)
    const parsed = JSON.parse(result['test_var']);
    expect(parsed).toHaveLength(2);
  });

  it('should validate schema and warn if value does not match (Static)', () => {
    const config = createStaticVariableConfig({
      id: 'test_static',
      scope: VariableScope.COHORT,
      definition: {
        name: 'static_var',
        description: '',
        schema: Type.Object({foo: Type.String()}),
      },
      value: {id: '1', value: JSON.stringify({foo: 123})}, // Invalid: foo should be string
    });

    const result = generateVariablesForScope([config], {
      scope: VariableScope.COHORT,
      experimentId: 'exp',
      cohortId: 'cohort',
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain(
      'Variable "static_var" value does not match its schema definition',
    );
  });

  it('should pass validation for correct values', () => {
    const config = createRandomPermutationVariableConfig({
      id: 'test',
      scope: VariableScope.COHORT,
      definition: {
        name: 'valid_var',
        description: '',
        // Schema describes output type (array of strings)
        schema: Type.Array(Type.String()),
      },
      values: [{id: '1', value: JSON.stringify('hello')}],
    });

    generateVariablesForScope([config], {
      scope: VariableScope.COHORT,
      experimentId: 'exp',
      cohortId: 'cohort',
    });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should flatten array to indexed variables when flattenToIndexedVariables is true', () => {
    const config = createRandomPermutationVariableConfig({
      id: 'test',
      scope: VariableScope.COHORT,
      definition: {
        name: 'charity',
        description: '',
        schema: Type.Array(Type.String()),
      },
      values: [
        {id: '1', value: JSON.stringify('Charity A')},
        {id: '2', value: JSON.stringify('Charity B')},
        {id: '3', value: JSON.stringify('Charity C')},
      ],
      flattenToIndexedVariables: true,
      shuffleConfig: createShuffleConfig({
        shuffle: false, // Disable shuffle for predictable test
        seed: SeedStrategy.COHORT,
      }),
    });

    const result = generateVariablesForScope([config], {
      scope: VariableScope.COHORT,
      experimentId: 'exp',
      cohortId: 'cohort',
    });

    // Should create charity_1, charity_2, charity_3
    expect(result['charity_1']).toBe(JSON.stringify('Charity A'));
    expect(result['charity_2']).toBe(JSON.stringify('Charity B'));
    expect(result['charity_3']).toBe(JSON.stringify('Charity C'));
    // Should NOT create single array variable
    expect(result['charity']).toBeUndefined();
  });

  it('should create single array variable when flattenToIndexedVariables is false', () => {
    const config = createRandomPermutationVariableConfig({
      id: 'test',
      scope: VariableScope.COHORT,
      definition: {
        name: 'charity',
        description: '',
        schema: Type.Array(Type.String()),
      },
      values: [
        {id: '1', value: JSON.stringify('Charity A')},
        {id: '2', value: JSON.stringify('Charity B')},
        {id: '3', value: JSON.stringify('Charity C')},
      ],
      flattenToIndexedVariables: false,
      shuffleConfig: createShuffleConfig({
        shuffle: false,
        seed: SeedStrategy.COHORT,
      }),
    });

    const result = generateVariablesForScope([config], {
      scope: VariableScope.COHORT,
      experimentId: 'exp',
      cohortId: 'cohort',
    });

    // Should create single array variable
    const parsed = JSON.parse(result['charity']);
    expect(parsed).toEqual(['Charity A', 'Charity B', 'Charity C']);
    // Should NOT create indexed variables
    expect(result['charity_1']).toBeUndefined();
  });

  it('should flatten complex objects when flattenToIndexedVariables is true', () => {
    const config = createRandomPermutationVariableConfig({
      id: 'test',
      scope: VariableScope.COHORT,
      definition: {
        name: 'item',
        description: '',
        schema: Type.Array(
          Type.Object({name: Type.String(), value: Type.Number()}),
        ),
      },
      values: [
        {id: '1', value: JSON.stringify({name: 'Item A', value: 100})},
        {id: '2', value: JSON.stringify({name: 'Item B', value: 200})},
      ],
      flattenToIndexedVariables: true,
      shuffleConfig: createShuffleConfig({
        shuffle: false,
        seed: SeedStrategy.COHORT,
      }),
    });

    const result = generateVariablesForScope([config], {
      scope: VariableScope.COHORT,
      experimentId: 'exp',
      cohortId: 'cohort',
    });

    // Should create item_1, item_2
    expect(JSON.parse(result['item_1'])).toEqual({name: 'Item A', value: 100});
    expect(JSON.parse(result['item_2'])).toEqual({name: 'Item B', value: 200});
    expect(result['item']).toBeUndefined();
  });
});

describe('extractVariablesFromVariableConfigs', () => {
  it('should extract indexed variable definitions when flattenToIndexedVariables is true', () => {
    const config = createRandomPermutationVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'charity',
        description: 'List of charities',
        schema: Type.Array(Type.String()),
      },
      values: [
        {id: '1', value: JSON.stringify('Charity A')},
        {id: '2', value: JSON.stringify('Charity B')},
        {id: '3', value: JSON.stringify('Charity C')},
      ],
      flattenToIndexedVariables: true,
    });

    const result = extractVariablesFromVariableConfigs([config]);

    // Should create definitions for charity_1, charity_2, charity_3
    expect(result['charity_1']).toEqual({
      name: 'charity_1',
      description: 'List of charities',
      schema: Type.String(),
    });
    expect(result['charity_2']).toEqual({
      name: 'charity_2',
      description: 'List of charities',
      schema: Type.String(),
    });
    expect(result['charity_3']).toEqual({
      name: 'charity_3',
      description: 'List of charities',
      schema: Type.String(),
    });
    // Should NOT create the array variable
    expect(result['charity']).toBeUndefined();
  });

  it('should respect numToSelect when creating indexed variable definitions', () => {
    const config = createRandomPermutationVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'item',
        description: 'Selected items',
        schema: Type.Array(Type.Number()),
      },
      values: [
        {id: '1', value: JSON.stringify(100)},
        {id: '2', value: JSON.stringify(200)},
        {id: '3', value: JSON.stringify(300)},
        {id: '4', value: JSON.stringify(400)},
      ],
      numToSelect: 2, // Only select 2 items
      flattenToIndexedVariables: true,
    });

    const result = extractVariablesFromVariableConfigs([config]);

    // Should only create item_1 and item_2
    expect(result['item_1']).toBeDefined();
    expect(result['item_2']).toBeDefined();
    expect(result['item_3']).toBeUndefined();
    expect(result['item_4']).toBeUndefined();
  });

  it('should extract array variable definition when flattenToIndexedVariables is false', () => {
    const config = createRandomPermutationVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'charity',
        description: 'List of charities',
        schema: Type.Array(Type.String()),
      },
      values: [
        {id: '1', value: JSON.stringify('Charity A')},
        {id: '2', value: JSON.stringify('Charity B')},
      ],
      flattenToIndexedVariables: false,
    });

    const result = extractVariablesFromVariableConfigs([config]);

    // Should create the array variable
    expect(result['charity']).toEqual({
      name: 'charity',
      description: 'List of charities',
      schema: Type.Array(Type.String()),
    });
    // Should NOT create indexed variables
    expect(result['charity_1']).toBeUndefined();
    expect(result['charity_2']).toBeUndefined();
  });
});
