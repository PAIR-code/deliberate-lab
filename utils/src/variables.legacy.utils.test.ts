import {Type} from '@sinclair/typebox';
import {SeedStrategy} from './utils/random.utils';
import {
  migrateVariableConfig,
  migrateVariableConfigs,
  isOldFormatConfig,
  OldRandomPermutationVariableConfig,
} from './variables.legacy.utils';
import {
  createRandomPermutationVariableConfig,
  createStaticVariableConfig,
  extractVariablesFromVariableConfigs,
} from './variables.utils';
import {
  RandomPermutationVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableScope,
} from './variables';

describe('isOldFormatConfig', () => {
  it('should return true for old-format configs', () => {
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'old-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [],
    };

    expect(isOldFormatConfig(oldConfig)).toBe(true);
  });

  it('should return false for new-format configs', () => {
    const newConfig = createRandomPermutationVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'charity',
        description: '',
        schema: Type.Array(Type.String()),
      },
      values: [],
    });

    expect(isOldFormatConfig(newConfig)).toBe(false);
  });

  it('should return false for static configs', () => {
    const staticConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {
        name: 'static_var',
        description: '',
        schema: Type.String(),
      },
      value: JSON.stringify('test'),
    });

    expect(isOldFormatConfig(staticConfig)).toBe(false);
  });
});

describe('migrateVariableConfig', () => {
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

  afterEach(() => {
    consoleInfoSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  it('should pass through new-format configs unchanged', () => {
    const newConfig = createRandomPermutationVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'charity',
        description: 'A charity',
        schema: Type.Array(Type.String()),
      },
      values: [JSON.stringify('Charity A')],
    });

    const result = migrateVariableConfig(newConfig);

    expect(result).toEqual(newConfig);
    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });

  it('should migrate old-format RandomPermutation config with single variableName', () => {
    // Old format config structure (pre-v19)
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'old-config-id',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [JSON.stringify('Charity A'), JSON.stringify('Charity B')],
    };

    const result = migrateVariableConfig(oldConfig);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.type).toBe(VariableConfigType.RANDOM_PERMUTATION);
    expect(migrated.id).toBe('old-config-id');
    expect(migrated.scope).toBe(VariableScope.COHORT);
    expect(migrated.definition.name).toBe('charity');
    expect(migrated.shuffleConfig.seed).toBe(SeedStrategy.COHORT);
    expect(migrated.numToSelect).toBe(1);
    expect(migrated.expandListToSeparateVariables).toBe(false);
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should migrate old-format config with multiple variableNames (indexed pattern)', () => {
    // Old format with charity_1, charity_2 pattern
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'old-indexed-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.PARTICIPANT,
      variableNames: ['charity_1', 'charity_2', 'charity_3'],
      schema: Type.String(),
      values: [
        JSON.stringify('Charity A'),
        JSON.stringify('Charity B'),
        JSON.stringify('Charity C'),
      ],
    };

    const result = migrateVariableConfig(oldConfig);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.definition.name).toBe('charity');
    expect(migrated.numToSelect).toBe(3);
    expect(migrated.expandListToSeparateVariables).toBe(true);
    expect(migrated.scope).toBe(VariableScope.PARTICIPANT);
  });

  it('should map SeedStrategy.EXPERIMENT to VariableScope.EXPERIMENT', () => {
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.EXPERIMENT,
      variableNames: ['var'],
      schema: Type.String(),
      values: [JSON.stringify('value')],
    };

    const result = migrateVariableConfig(oldConfig);
    const migrated = result as RandomPermutationVariableConfig;

    expect(migrated.scope).toBe(VariableScope.EXPERIMENT);
  });

  it('should map SeedStrategy.CUSTOM to VariableScope.PARTICIPANT', () => {
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.CUSTOM,
      variableNames: ['var'],
      schema: Type.String(),
      values: [JSON.stringify('value')],
    };

    const result = migrateVariableConfig(oldConfig);
    const migrated = result as RandomPermutationVariableConfig;

    expect(migrated.scope).toBe(VariableScope.PARTICIPANT);
  });

  it('should generate an ID if old config lacks one', () => {
    // Use type assertion for config missing id field
    const oldConfig = {
      id: '', // Empty ID should trigger generation
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['var'],
      schema: Type.String(),
      values: [],
    } as OldRandomPermutationVariableConfig;

    const result = migrateVariableConfig(oldConfig);

    expect(result).not.toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.id.length).toBeGreaterThan(0);
  });

  it('should handle empty variableNames array', () => {
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: [],
      schema: Type.String(),
      values: [JSON.stringify('value')],
    };

    const result = migrateVariableConfig(oldConfig);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.definition.name).toBe('variable'); // fallback name
    expect(migrated.numToSelect).toBe(0);
  });
});

describe('migrateVariableConfigs', () => {
  it('should migrate an array of mixed old and new configs', () => {
    const newConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {
        name: 'static_var',
        description: '',
        schema: Type.String(),
      },
      value: JSON.stringify('hello'),
    });

    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'old-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [JSON.stringify('Charity A')],
    };

    const result = migrateVariableConfigs([newConfig, oldConfig]);

    expect(result).toHaveLength(2);
    // First should be unchanged static config
    expect(result[0]).toEqual(newConfig);
    // Second should be migrated
    const migrated = result[1] as RandomPermutationVariableConfig;
    expect(migrated.definition.name).toBe('charity');
  });

  it('should filter out configs that fail migration', () => {
    const validConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {
        name: 'valid',
        description: '',
        schema: Type.String(),
      },
      value: JSON.stringify('test'),
    });

    // An unknown old format that cannot be migrated (missing seedStrategy)
    const unknownOldConfig = {
      id: 'unknown',
      type: 'unknown_type' as VariableConfigType,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['x'],
      schema: Type.String(),
      values: [],
    } as OldRandomPermutationVariableConfig;

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = migrateVariableConfigs([validConfig, unknownOldConfig]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(validConfig);

    consoleWarnSpy.mockRestore();
  });

  it('should handle empty array', () => {
    const result = migrateVariableConfigs([]);
    expect(result).toEqual([]);
  });
});

describe('extractVariablesFromVariableConfigs with legacy migration', () => {
  it('should handle old-format configs transparently', () => {
    // Old format config that would crash without migration
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'old-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity_1', 'charity_2'],
      schema: Type.String(),
      values: [JSON.stringify('Charity A'), JSON.stringify('Charity B')],
    };

    // Suppress console.info during test
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

    // This should NOT throw, thanks to migration
    // Cast to VariableConfig[] since extractVariablesFromVariableConfigs expects that type
    const result = extractVariablesFromVariableConfigs([
      oldConfig as unknown as VariableConfig,
    ]);

    // Should create charity_1 and charity_2 definitions
    expect(result['charity_1']).toBeDefined();
    expect(result['charity_2']).toBeDefined();
    expect(result['charity_1'].name).toBe('charity_1');
    expect(result['charity_2'].name).toBe('charity_2');

    consoleInfoSpy.mockRestore();
  });

  it('should handle mixed old and new configs', () => {
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

    const newConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {
        name: 'new_var',
        description: '',
        schema: Type.String(),
      },
      value: JSON.stringify('test'),
    });

    // Old config with multiple variableNames (will expand to indexed variables)
    const oldConfig: OldRandomPermutationVariableConfig = {
      id: 'old-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['old_var_1', 'old_var_2'],
      schema: Type.String(),
      values: [JSON.stringify('value1'), JSON.stringify('value2')],
    };

    const result = extractVariablesFromVariableConfigs([
      newConfig,
      oldConfig as unknown as VariableConfig,
    ]);

    expect(result['new_var']).toBeDefined();
    // Old config with 2 variableNames expands to old_var_1, old_var_2
    expect(result['old_var_1']).toBeDefined();
    expect(result['old_var_2']).toBeDefined();

    consoleInfoSpy.mockRestore();
  });
});
