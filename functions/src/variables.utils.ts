import {
  BalancedAssignmentVariableConfig,
  BalanceAcross,
  BalanceStrategy,
  ScopeContext,
  VariableConfig,
  VariableConfigType,
  VariableScope,
  choices,
  generateRandomPermutationVariables,
  generateStaticVariables,
  normalizeWeights,
  parseJsonValue,
  validateParsedVariableValue,
  weightedChoice,
  weightedRoundRobin,
} from '@deliberation-lab/utils';

import {app} from './app';

/**
 * Get the value to assign using the LEAST_USED strategy with optional weights.
 * Picks the value that is most under-represented relative to its target ratio.
 * Breaks ties using seeded random.
 */
function getLeastUsedValue(
  counts: Record<string, number>,
  values: string[],
  weights: number[] | undefined,
  participantSeed: string,
): string {
  const normalized = normalizeWeights(values.length, weights);
  const totalAssigned = Object.values(counts).reduce((sum, c) => sum + c, 0);

  if (totalAssigned === 0) {
    // No assignments yet - pick based on weights (highest weight first, random tie-break)
    const maxWeight = Math.max(...normalized);
    const highestWeightValues = values.filter(
      (_, i) => normalized[i] === maxWeight,
    );
    return choices(highestWeightValues, 1, participantSeed)[0];
  }

  // Calculate how under-represented each value is relative to its target
  // Positive deviation = under-represented, negative = over-represented
  const deviations = values.map((v, i) => {
    const targetRatio = normalized[i];
    const actualRatio = counts[v] / totalAssigned;
    return targetRatio - actualRatio;
  });

  const maxDeviation = Math.max(...deviations);
  const mostUnderRepresented = values.filter(
    (_, i) => deviations[i] === maxDeviation,
  );

  // Pick using seeded random among most under-represented values
  return choices(mostUnderRepresented, 1, participantSeed)[0];
}

/**
 * Generate variables for a Balanced Assignment config.
 * Requires database queries to determine the assignment based on existing participants.
 */
async function generateBalancedAssignmentVariables(
  config: BalancedAssignmentVariableConfig,
  experimentId: string,
  cohortId: string,
  participantId: string,
): Promise<Record<string, string>> {
  if (config.values.length === 0) {
    console.warn(
      `Balanced assignment variable "${config.definition.name}" has no values configured`,
    );
    return {};
  }

  const firestore = app.firestore();
  let selectedValue: string;

  // Create a unique seed for this variable + participant combination
  const variableSeed = `${participantId}-${config.definition.name}`;

  switch (config.balanceStrategy) {
    case BalanceStrategy.RANDOM:
      // Pure random doesn't need database queries, but uses seeded random
      selectedValue = weightedChoice(
        config.values,
        config.weights,
        variableSeed,
      );
      break;

    case BalanceStrategy.ROUND_ROBIN: {
      // Get participant count based on balance scope
      let participantCount: number;

      if (config.balanceAcross === BalanceAcross.EXPERIMENT) {
        // Count all participants in the experiment
        const countResult = await firestore
          .collection(`experiments/${experimentId}/participants`)
          .count()
          .get();
        participantCount = countResult.data().count;
      } else {
        // Count participants in the current cohort
        const countResult = await firestore
          .collection(`experiments/${experimentId}/participants`)
          .where('currentCohortId', '==', cohortId)
          .count()
          .get();
        participantCount = countResult.data().count;
      }

      selectedValue = weightedRoundRobin(
        config.values,
        participantCount,
        config.weights,
      );
      break;
    }

    case BalanceStrategy.LEAST_USED: {
      // Count assignments per value using efficient count() queries
      const counts: Record<string, number> = {};
      const baseCollection = firestore.collection(
        `experiments/${experimentId}/participants`,
      );

      for (const value of config.values) {
        let query;
        if (config.balanceAcross === BalanceAcross.EXPERIMENT) {
          // Count all participants with this value
          query = baseCollection.where(
            `variableMap.${config.definition.name}`,
            '==',
            value,
          );
        } else {
          // Count participants in the current cohort with this value
          query = baseCollection
            .where('currentCohortId', '==', cohortId)
            .where(`variableMap.${config.definition.name}`, '==', value);
        }

        const countResult = await query.count().get();
        counts[value] = countResult.data().count;
      }

      selectedValue = getLeastUsedValue(
        counts,
        config.values,
        config.weights,
        variableSeed,
      );
      break;
    }

    default:
      // Fallback to round robin
      console.warn(
        `Unknown balance strategy for variable "${config.definition.name}", falling back to round robin`,
      );
      const countResult = await firestore
        .collection(`experiments/${experimentId}/participants`)
        .count()
        .get();
      selectedValue = weightedRoundRobin(
        config.values,
        countResult.data().count,
        config.weights,
      );
  }

  // Parse and validate the selected value
  // Schema is stored as Array(ItemType), so extract the item schema for validation
  const parsedValue = parseJsonValue(selectedValue);
  const itemSchema =
    'items' in config.definition.schema
      ? config.definition.schema.items
      : config.definition.schema;
  validateParsedVariableValue(itemSchema, parsedValue, config.definition.name);

  return {[config.definition.name]: selectedValue};
}

/**
 * Given variable configs, generate variable-to-value mappings
 * for a specific scope (Experiment, Cohort, or Participant).
 *
 * This function handles all variable types:
 * - Static: Fixed value
 * - Random permutation: Shuffled/selected values
 * - Balanced assignment: Database-aware balanced distribution (participant scope only)
 *
 * @param variableConfigs List of configs to process
 * @param context The scope context with experiment/cohort/participant IDs
 */
export async function generateVariablesForScope(
  variableConfigs: VariableConfig[],
  context: ScopeContext,
): Promise<Record<string, string>> {
  const variableToValueMap: Record<string, string> = {};

  // Filter configs by scope first
  const scopedConfigs = variableConfigs.filter(
    (c) => c.scope === context.scope,
  );

  for (const config of scopedConfigs) {
    let generatedVariables: Record<string, string> = {};

    switch (config.type) {
      case VariableConfigType.STATIC:
        generatedVariables = generateStaticVariables(config);
        break;

      case VariableConfigType.RANDOM_PERMUTATION:
        generatedVariables = generateRandomPermutationVariables(
          config,
          context,
        );
        break;

      case VariableConfigType.BALANCED_ASSIGNMENT:
        // Balanced assignment requires participant context
        if (context.scope === VariableScope.PARTICIPANT) {
          generatedVariables = await generateBalancedAssignmentVariables(
            config,
            context.experimentId,
            context.cohortId,
            context.participantId,
          );
        } else {
          console.warn(
            `Balanced assignment variable "${config.definition.name}" requires participant scope`,
          );
        }
        break;

      default:
        // Unknown config type - skip
        break;
    }

    // Merge generated variables into the result map
    Object.assign(variableToValueMap, generatedVariables);
  }

  return variableToValueMap;
}
