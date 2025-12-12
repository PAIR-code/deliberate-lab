import {
  BalancedAssignmentVariableConfig,
  BalanceAcross,
  BalanceStrategy,
  ScopeContext,
  VariableConfig,
  VariableConfigType,
  VariableScope,
  containsTemplateVariables,
  generateRandomPermutationVariables,
  generateStaticVariables,
  getVariableContext,
  parseJsonValue,
  resolveTemplateVariables,
  validateParsedVariableValue,
  weightedChoice,
  weightedRoundRobin,
} from '@deliberation-lab/utils';

import {app} from './app';
import {
  getFirestoreCohort,
  getFirestoreExperiment,
  getFirestoreParticipant,
} from './utils/firestore';

/**
 * Generate variables for a Balanced Assignment config.
 * Requires database queries to determine the assignment based on existing participants.
 *
 * IMPORTANT: Race condition consideration
 * The count/aggregation queries used here are not locked by Firestore transactions.
 * If multiple participants join simultaneously, they may see the same counts and
 * receive identical assignments. This is mitigated by a random delay before the
 * transaction in createParticipant, but not fully eliminated.
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

/**
 * Resolve template variables in a string using experiment/cohort/participant context.
 * Fetches necessary data from Firestore and resolves variables like {{policy.name}}.
 * Returns the original text unchanged if no template variables are present.
 *
 * @param participantPrivateId - The participant whose variables should be used for resolution.
 *   For agent participants, pass themselves. For mediators in private chats, pass the
 *   participant they're chatting with.
 */
export async function resolveStringWithVariables(
  text: string,
  experimentId: string,
  cohortId: string,
  participantPrivateId?: string,
): Promise<string> {
  // Early return if no template variables present
  if (!containsTemplateVariables(text)) {
    return text;
  }

  const experiment = await getFirestoreExperiment(experimentId);
  const cohort = await getFirestoreCohort(experimentId, cohortId);

  if (!experiment || !cohort) {
    return text;
  }

  // Fetch participant if provided, to include their variables.
  const participant = participantPrivateId
    ? await getFirestoreParticipant(experimentId, participantPrivateId)
    : undefined;

  const {variableDefinitions, valueMap} = getVariableContext(
    experiment,
    cohort,
    participant,
  );

  return resolveTemplateVariables(text, variableDefinitions, valueMap);
}
