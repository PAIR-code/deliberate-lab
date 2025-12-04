import {
  BalancedAssignmentVariableConfig,
  BalanceAcross,
  BalanceStrategy,
  ParticipantProfileExtended,
  ParticipantStatus,
  ScopeContext,
  VariableConfig,
  VariableConfigType,
  VariableScope,
  choices,
  generateRandomPermutationVariables,
  generateStaticVariables,
  parseJsonValue,
  validateParsedVariableValue,
} from '@deliberation-lab/utils';

import {app} from './app';

/**
 * Count how many participants have been assigned each value for a balanced assignment variable.
 * Returns a map of JSON string value to count.
 */
function countValueAssignments(
  participants: ParticipantProfileExtended[],
  variableName: string,
  values: string[],
): Record<string, number> {
  // Initialize counts for all possible values
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = 0;
  }

  // Count existing assignments
  for (const participant of participants) {
    const assignedValue = participant.variableMap?.[variableName];
    if (assignedValue && assignedValue in counts) {
      counts[assignedValue]++;
    }
  }

  return counts;
}

/**
 * Get the value to assign using the LEAST_USED strategy.
 * Picks the value with the fewest assignments; breaks ties using seeded random.
 */
function getLeastUsedValue(
  counts: Record<string, number>,
  values: string[],
  participantSeed: string,
): string {
  const minCount = Math.min(...Object.values(counts));
  const leastUsedValues = values.filter((v) => counts[v] === minCount);

  // Pick using seeded random among least-used values
  return choices(leastUsedValues, 1, participantSeed)[0];
}

/**
 * Get the value to assign using the ROUND_ROBIN strategy.
 * Uses the total participant count modulo number of values.
 */
function getRoundRobinValue(
  participantCount: number,
  values: string[],
): string {
  return values[participantCount % values.length];
}

/**
 * Get the value to assign using the RANDOM strategy.
 * Uses seeded random based on participant ID for reproducibility.
 */
function getRandomValue(values: string[], participantSeed: string): string {
  return choices(values, 1, participantSeed)[0];
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
      selectedValue = getRandomValue(config.values, variableSeed);
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

      selectedValue = getRoundRobinValue(participantCount, config.values);
      break;
    }

    case BalanceStrategy.LEAST_USED: {
      // Get participants based on balance scope
      let participantsQuery;

      if (config.balanceAcross === BalanceAcross.EXPERIMENT) {
        // All active participants in the experiment
        participantsQuery = firestore
          .collection(`experiments/${experimentId}/participants`)
          .where('currentStatus', 'in', [
            ParticipantStatus.IN_PROGRESS,
            ParticipantStatus.TRANSFER_PENDING,
            ParticipantStatus.ATTENTION_CHECK,
            ParticipantStatus.SUCCESS,
          ]);
      } else {
        // Active participants in the current cohort
        participantsQuery = firestore
          .collection(`experiments/${experimentId}/participants`)
          .where('currentCohortId', '==', cohortId)
          .where('currentStatus', 'in', [
            ParticipantStatus.IN_PROGRESS,
            ParticipantStatus.TRANSFER_PENDING,
            ParticipantStatus.ATTENTION_CHECK,
            ParticipantStatus.SUCCESS,
          ]);
      }

      const participantsSnapshot = await participantsQuery.get();
      const participants = participantsSnapshot.docs.map(
        (doc) => doc.data() as ParticipantProfileExtended,
      );

      const counts = countValueAssignments(
        participants,
        config.definition.name,
        config.values,
      );
      selectedValue = getLeastUsedValue(counts, config.values, variableSeed);
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
      selectedValue = getRoundRobinValue(
        countResult.data().count,
        config.values,
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
