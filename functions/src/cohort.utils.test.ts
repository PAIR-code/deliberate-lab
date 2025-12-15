/**
 * Tests for cohort utility functions.
 *
 * Unit tests for transformCohortValuesKeys (no Firestore needed).
 * Integration tests require Firestore emulator - run via: npm run test:firestore
 */

import {
  createStaticVariableConfig,
  createRandomPermutationVariableConfig,
  VariableScope,
  VariableType,
  VariableConfigType,
  SeedStrategy,
} from '@deliberation-lab/utils';
import {transformCohortValuesKeys} from './cohort.utils';

describe('transformCohortValuesKeys', () => {
  it('should transform alias key to cohortId for matching static variable', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
          'arm-skeptic': JSON.stringify('skeptic'),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(VariableConfigType.STATIC);
    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].cohortValues).toEqual({
        'cohort-123': JSON.stringify('pro_ai'),
      });
    }
  });

  it('should not modify config when alias not in cohortValues', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-other',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(configs[0]); // Same reference, not modified
  });

  it('should not modify config when cohortValues not present', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        // No cohortValues
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(configs[0]); // Same reference, not modified
  });

  it('should not modify non-static variable configs', () => {
    const configs = [
      createRandomPermutationVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'items',
          description: 'Random items',
          schema: VariableType.array(VariableType.STRING),
        },
        values: [JSON.stringify('a'), JSON.stringify('b')],
        shuffleConfig: {
          shuffle: true,
          seed: SeedStrategy.COHORT,
          customSeed: '',
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(configs[0]); // Same reference, not modified
  });

  it('should transform multiple configs with matching aliases', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
          'arm-skeptic': JSON.stringify('skeptic'),
        },
      }),
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'agent_name',
          description: 'Agent name',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('Default Agent'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('Pro-AI Agent'),
          'arm-skeptic': JSON.stringify('Skeptic Agent'),
        },
      }),
      createStaticVariableConfig({
        scope: VariableScope.EXPERIMENT,
        definition: {
          name: 'experiment_name',
          description: 'Experiment name',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('My Experiment'),
        // No cohortValues - experiment-level variable
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-xyz',
    );

    expect(result).toHaveLength(3);

    // First config transformed
    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].cohortValues).toEqual({
        'cohort-xyz': JSON.stringify('pro_ai'),
      });
    }

    // Second config transformed
    if (result[1].type === VariableConfigType.STATIC) {
      expect(result[1].cohortValues).toEqual({
        'cohort-xyz': JSON.stringify('Pro-AI Agent'),
      });
    }

    // Third config unchanged (no cohortValues)
    expect(result[2]).toBe(configs[2]);
  });

  it('should handle empty variable configs array', () => {
    const result = transformCohortValuesKeys([], 'arm-pro-ai', 'cohort-123');
    expect(result).toEqual([]);
  });

  it('should preserve other properties of static config when transforming', () => {
    const configs = [
      createStaticVariableConfig({
        id: 'var-1',
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].id).toBe('var-1');
      expect(result[0].scope).toBe(VariableScope.COHORT);
      expect(result[0].value).toBe(JSON.stringify('control'));
      expect(result[0].definition.name).toBe('treatment');
    }
  });

  it('should work with complex cohortValues containing objects', () => {
    const proAiPersona = {
      name: 'Pro-AI Agent',
      traits: ['enthusiastic', 'technical'],
      confidence: 0.9,
    };

    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'persona',
          description: 'Agent persona',
          schema: VariableType.object({
            name: VariableType.STRING,
            traits: VariableType.array(VariableType.STRING),
            confidence: VariableType.NUMBER,
          }),
        },
        value: JSON.stringify({name: 'Default', traits: [], confidence: 0.5}),
        cohortValues: {
          'arm-pro-ai': JSON.stringify(proAiPersona),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].cohortValues).toEqual({
        'cohort-123': JSON.stringify(proAiPersona),
      });
    }
  });
});
