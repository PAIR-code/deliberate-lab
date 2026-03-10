import {Type} from '@sinclair/typebox';
import {SeedStrategy} from './utils/random.utils';
import {
  migrateVariableConfig,
  migrateVariableConfigs,
  isOldFormatConfig,
  isV1FormatConfig,
  isV2FormatConfig,
  v1SchemaToTSchema,
  V1RandomPermutationVariableConfig,
  V2RandomPermutationVariableConfig,
  LegacyVariableConfig,
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

// ************************************************************************* //
// DETECTION TESTS                                                           //
// ************************************************************************* //

describe('isV1FormatConfig', () => {
  it('should return true for V1 configs', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      variableType: 'string',
      values: [],
    };

    expect(isV1FormatConfig(v1Config)).toBe(true);
  });

  it('should return true for V1 configs with object schema', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-obj-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity_1', 'charity_2'],
      variableType: 'object',
      variableSchema: {
        name: 'string',
        score: 'number',
      },
      values: [],
    };

    expect(isV1FormatConfig(v1Config)).toBe(true);
  });

  it('should return true for V1 configs without seedStrategy', () => {
    const v1Config = {
      id: 'v1-no-seed',
      type: VariableConfigType.RANDOM_PERMUTATION,
      variableNames: ['var'],
      variableType: 'string',
      values: [],
    } as V1RandomPermutationVariableConfig;

    expect(isV1FormatConfig(v1Config)).toBe(true);
  });

  it('should return false for V2 configs', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [],
    };

    expect(isV1FormatConfig(v2Config)).toBe(false);
  });

  it('should return false for current format configs', () => {
    const newConfig = createRandomPermutationVariableConfig({
      definition: {
        name: 'charity',
        description: '',
        schema: Type.Array(Type.String()),
      },
    });

    expect(isV1FormatConfig(newConfig)).toBe(false);
  });
});

describe('isV2FormatConfig', () => {
  it('should return true for V2 configs', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [],
    };

    expect(isV2FormatConfig(v2Config)).toBe(true);
  });

  it('should return false for V1 configs', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      variableType: 'string',
      values: [],
    };

    expect(isV2FormatConfig(v1Config)).toBe(false);
  });

  it('should return false for current format configs', () => {
    const newConfig = createRandomPermutationVariableConfig({
      definition: {
        name: 'charity',
        description: '',
        schema: Type.Array(Type.String()),
      },
    });

    expect(isV2FormatConfig(newConfig)).toBe(false);
  });

  it('should return false for static configs', () => {
    const staticConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {name: 'static_var', description: '', schema: Type.String()},
      value: JSON.stringify('test'),
    });

    expect(isV2FormatConfig(staticConfig)).toBe(false);
  });
});

describe('isOldFormatConfig', () => {
  it('should return true for V1 configs', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      variableNames: ['charity'],
      variableType: 'object',
      variableSchema: {name: 'string', key: 'string'},
      values: [],
    };

    expect(isOldFormatConfig(v1Config)).toBe(true);
  });

  it('should return true for V2 configs', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [],
    };

    expect(isOldFormatConfig(v2Config)).toBe(true);
  });

  it('should return false for current format configs', () => {
    const newConfig = createRandomPermutationVariableConfig();
    expect(isOldFormatConfig(newConfig)).toBe(false);
  });

  it('should return false for static configs', () => {
    const staticConfig = createStaticVariableConfig();
    expect(isOldFormatConfig(staticConfig)).toBe(false);
  });
});

// ************************************************************************* //
// V1 SCHEMA CONVERSION TESTS                                               //
// ************************************************************************* //

describe('v1SchemaToTSchema', () => {
  it('should convert string type', () => {
    const schema = v1SchemaToTSchema('string');
    expect(schema.type).toBe('string');
  });

  it('should convert number type', () => {
    const schema = v1SchemaToTSchema('number');
    expect(schema.type).toBe('number');
  });

  it('should convert boolean type', () => {
    const schema = v1SchemaToTSchema('boolean');
    expect(schema.type).toBe('boolean');
  });

  it('should convert object type with variableSchema', () => {
    const schema = v1SchemaToTSchema('object', {
      name: 'string',
      score: 'number',
      active: 'boolean',
    });

    expect(schema.type).toBe('object');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.score.type).toBe('number');
    expect(schema.properties.active.type).toBe('boolean');
  });

  it('should convert object type without variableSchema to string fallback', () => {
    const schema = v1SchemaToTSchema('object');
    // Without a variableSchema, falls back to string
    expect(schema.type).toBe('string');
  });

  it('should handle the charity experiment schema', () => {
    // This matches the actual V1 data from Firestore (jimbojw's console export)
    const schema = v1SchemaToTSchema('object', {
      key: 'string',
      name: 'string',
      link: 'string',
      score: 'string',
      mission: 'string',
    });

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['key', 'name', 'link', 'score', 'mission']),
    );
    for (const prop of Object.values(schema.properties) as Array<{
      type: string;
    }>) {
      expect(prop.type).toBe('string');
    }
  });
});

// ************************************************************************* //
// MIGRATION TESTS                                                           //
// ************************************************************************* //

describe('migrateVariableConfig', () => {
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

  afterEach(() => {
    consoleInfoSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  it('should pass through current-format configs unchanged', () => {
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

  // V1 migration tests

  it('should migrate V1 config with string variableType', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-string',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['color'],
      variableType: 'string',
      values: [JSON.stringify('red'), JSON.stringify('blue')],
    };

    const result = migrateVariableConfig(v1Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.type).toBe(VariableConfigType.RANDOM_PERMUTATION);
    expect(migrated.id).toBe('v1-string');
    expect(migrated.scope).toBe(VariableScope.COHORT);
    expect(migrated.definition.name).toBe('color');
    expect(migrated.definition.schema.type).toBe('array');
    expect(migrated.definition.schema.items.type).toBe('string');
    expect(migrated.numToSelect).toBe(1);
    expect(migrated.expandListToSeparateVariables).toBe(false);
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should migrate V1 config with object variableType and variableSchema', () => {
    // This matches the actual c_p3_4 experiment structure in Firestore
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'charity-permutation-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: [
        'charity_1',
        'charity_2',
        'charity_3',
        'charity_4',
        'charity_5',
        'charity_6',
        'charity_7',
        'charity_8',
        'charity_9',
      ],
      variableType: 'object',
      variableSchema: {
        key: 'string',
        name: 'string',
        link: 'string',
        score: 'string',
        mission: 'string',
      },
      values: [JSON.stringify({key: 'ifaw', name: 'IFAW'})],
    };

    const result = migrateVariableConfig(v1Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.id).toBe('charity-permutation-config');
    expect(migrated.definition.name).toBe('charity');
    expect(migrated.scope).toBe(VariableScope.COHORT);
    expect(migrated.numToSelect).toBe(9);
    expect(migrated.expandListToSeparateVariables).toBe(true);

    // Check schema: should be Array(Object({key, name, ...}))
    expect(migrated.definition.schema.type).toBe('array');
    const itemSchema = migrated.definition.schema.items;
    expect(itemSchema.type).toBe('object');
    expect(itemSchema.properties.key.type).toBe('string');
    expect(itemSchema.properties.name.type).toBe('string');
    expect(itemSchema.properties.mission.type).toBe('string');
  });

  it('should migrate V1 config without seedStrategy (earliest format)', () => {
    const v1Config = {
      id: 'v1-no-seed',
      type: VariableConfigType.RANDOM_PERMUTATION,
      variableNames: ['var_1', 'var_2'],
      variableType: 'string',
      values: [JSON.stringify('a'), JSON.stringify('b')],
    } as V1RandomPermutationVariableConfig;

    const result = migrateVariableConfig(v1Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    // Should default to PARTICIPANT scope when seedStrategy is missing
    expect(migrated.scope).toBe(VariableScope.PARTICIPANT);
    expect(migrated.shuffleConfig.seed).toBe(SeedStrategy.PARTICIPANT);
    expect(migrated.definition.name).toBe('var');
    expect(migrated.numToSelect).toBe(2);
  });

  // V2 migration tests

  it('should migrate V2 config with single variableName', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-config-id',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      schema: Type.String(),
      values: [JSON.stringify('Charity A'), JSON.stringify('Charity B')],
    };

    const result = migrateVariableConfig(v2Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.type).toBe(VariableConfigType.RANDOM_PERMUTATION);
    expect(migrated.id).toBe('v2-config-id');
    expect(migrated.scope).toBe(VariableScope.COHORT);
    expect(migrated.definition.name).toBe('charity');
    expect(migrated.shuffleConfig.seed).toBe(SeedStrategy.COHORT);
    expect(migrated.numToSelect).toBe(1);
    expect(migrated.expandListToSeparateVariables).toBe(false);
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should migrate V2 config with multiple variableNames (indexed pattern)', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-indexed-config',
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

    const result = migrateVariableConfig(v2Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.definition.name).toBe('charity');
    expect(migrated.numToSelect).toBe(3);
    expect(migrated.expandListToSeparateVariables).toBe(true);
    expect(migrated.scope).toBe(VariableScope.PARTICIPANT);
  });

  // Shared behavior tests

  it('should map SeedStrategy.EXPERIMENT to VariableScope.EXPERIMENT', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.EXPERIMENT,
      variableNames: ['var'],
      variableType: 'string',
      values: [JSON.stringify('value')],
    };

    const result = migrateVariableConfig(v1Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(migrated.scope).toBe(VariableScope.EXPERIMENT);
  });

  it('should map SeedStrategy.CUSTOM to VariableScope.PARTICIPANT', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.CUSTOM,
      variableNames: ['var'],
      schema: Type.String(),
      values: [JSON.stringify('value')],
    };

    const result = migrateVariableConfig(v2Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(migrated.scope).toBe(VariableScope.PARTICIPANT);
  });

  it('should generate an ID if old config has empty id', () => {
    const v1Config = {
      id: '',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['var'],
      variableType: 'string',
      values: [],
    } as V1RandomPermutationVariableConfig;

    const result = migrateVariableConfig(v1Config);

    expect(result).not.toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.id.length).toBeGreaterThan(0);
  });

  it('should handle empty variableNames array', () => {
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'test',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: [],
      variableType: 'string',
      values: [JSON.stringify('value')],
    };

    const result = migrateVariableConfig(v1Config);
    const migrated = result as RandomPermutationVariableConfig;

    expect(result).not.toBeNull();
    expect(migrated.definition.name).toBe('variable'); // fallback name
    expect(migrated.numToSelect).toBe(0);
  });
});

describe('migrateVariableConfigs', () => {
  it('should migrate an array of mixed V1, V2, and current configs', () => {
    const currentConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {name: 'static_var', description: '', schema: Type.String()},
      value: JSON.stringify('hello'),
    });

    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity'],
      variableType: 'string',
      values: [JSON.stringify('Charity A')],
    };

    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.PARTICIPANT,
      variableNames: ['color_1', 'color_2'],
      schema: Type.String(),
      values: [JSON.stringify('red'), JSON.stringify('blue')],
    };

    const result = migrateVariableConfigs([currentConfig, v1Config, v2Config]);

    expect(result).toHaveLength(3);
    // First should be unchanged static config
    expect(result[0]).toEqual(currentConfig);
    // Second should be migrated V1
    const migratedV1 = result[1] as RandomPermutationVariableConfig;
    expect(migratedV1.definition.name).toBe('charity');
    // Third should be migrated V2
    const migratedV2 = result[2] as RandomPermutationVariableConfig;
    expect(migratedV2.definition.name).toBe('color');
    expect(migratedV2.expandListToSeparateVariables).toBe(true);
  });

  it('should filter out configs that fail migration', () => {
    const validConfig = createStaticVariableConfig({
      scope: VariableScope.EXPERIMENT,
      definition: {name: 'valid', description: '', schema: Type.String()},
      value: JSON.stringify('test'),
    });

    // An unknown old format that cannot be migrated
    const unknownOldConfig = {
      id: 'unknown',
      type: 'unknown_type' as VariableConfigType,
      variableNames: ['x'],
      variableType: 'string',
      values: [],
    } as unknown as LegacyVariableConfig;

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
  it('should handle V1 configs transparently', () => {
    // V1 config that would crash without migration
    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity_1', 'charity_2'],
      variableType: 'object',
      variableSchema: {name: 'string', key: 'string'},
      values: [
        JSON.stringify({name: 'A', key: 'a'}),
        JSON.stringify({name: 'B', key: 'b'}),
      ],
    };

    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

    // This should NOT throw, thanks to migration
    const result = extractVariablesFromVariableConfigs([
      v1Config as unknown as VariableConfig,
    ]);

    // Should create charity_1 and charity_2 definitions
    expect(result['charity_1']).toBeDefined();
    expect(result['charity_2']).toBeDefined();
    expect(result['charity_1'].name).toBe('charity_1');
    expect(result['charity_2'].name).toBe('charity_2');

    consoleInfoSpy.mockRestore();
  });

  it('should handle V2 configs transparently', () => {
    const v2Config: V2RandomPermutationVariableConfig = {
      id: 'v2-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['charity_1', 'charity_2'],
      schema: Type.String(),
      values: [JSON.stringify('Charity A'), JSON.stringify('Charity B')],
    };

    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

    const result = extractVariablesFromVariableConfigs([
      v2Config as unknown as VariableConfig,
    ]);

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
      definition: {name: 'new_var', description: '', schema: Type.String()},
      value: JSON.stringify('test'),
    });

    const v1Config: V1RandomPermutationVariableConfig = {
      id: 'v1-config',
      type: VariableConfigType.RANDOM_PERMUTATION,
      seedStrategy: SeedStrategy.COHORT,
      variableNames: ['old_var_1', 'old_var_2'],
      variableType: 'string',
      values: [JSON.stringify('value1'), JSON.stringify('value2')],
    };

    const result = extractVariablesFromVariableConfigs([
      newConfig,
      v1Config as unknown as VariableConfig,
    ]);

    expect(result['new_var']).toBeDefined();
    expect(result['old_var_1']).toBeDefined();
    expect(result['old_var_2']).toBeDefined();

    consoleInfoSpy.mockRestore();
  });
});
