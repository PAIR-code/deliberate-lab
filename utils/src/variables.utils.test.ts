import {Type} from '@sinclair/typebox';
import {SeedStrategy, createShuffleConfig} from './utils/random.utils';
import {
  generateVariablesForScope,
  createRandomPermutationVariableConfig,
  createStaticVariableConfig,
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
        // Schema expects array of NUMBERS
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
});
