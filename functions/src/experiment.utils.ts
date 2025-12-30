/**
 * Shared utilities for experiment creation and management
 */

import {Firestore, Timestamp, Transaction} from 'firebase-admin/firestore';
import {
  ExperimentTemplate,
  StageConfig,
  UnifiedTimestamp,
  Visibility,
  createAgentMediatorPersonaConfig,
  createAgentParticipantPersonaConfig,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  generateId,
  VariableScope,
} from '@deliberation-lab/utils';
import {getExperimentDownload} from './data';
import {generateVariablesForScope} from './variables.utils';
import {AuthGuard} from './utils/auth-guard';

/**
 * Options for writing an experiment from a template
 */
export interface WriteExperimentOptions {
  /** Firestore collection to write to. Defaults to 'experiments' */
  collectionName?: string;
}

/**
 * Write an experiment from a template to Firestore.
 *
 * This is the shared logic used by both:
 * - writeExperiment callable (UI experiment creation)
 * - forkExperiment REST API endpoint
 *
 * @param firestore - Firestore instance
 * @param template - The experiment template containing experiment config, stages, and agents
 * @param creatorId - The experimenter ID to set as creator
 * @param options - Additional options
 * @returns The created experiment ID, or empty string if experiment already exists
 */
export async function writeExperimentFromTemplate(
  firestore: Firestore,
  template: ExperimentTemplate,
  creatorId: string,
  options: WriteExperimentOptions = {},
): Promise<string> {
  const {collectionName = 'experiments'} = options;

  // Set up experiment config with stageIds
  const experimentConfig = createExperimentConfig(
    template.stageConfigs,
    template.experiment,
  );

  // Define document reference
  const document = firestore
    .collection(collectionName)
    .doc(experimentConfig.id);

  // If experiment exists, do not allow creation
  if ((await document.get()).exists) {
    return '';
  }

  // Build metadata with admin SDK Timestamps and set creator
  const timestamp = Timestamp.now() as UnifiedTimestamp;
  experimentConfig.metadata = createMetadataConfig({
    ...experimentConfig.metadata,
    creator: creatorId,
    dateCreated: timestamp,
    dateModified: timestamp,
  });

  // Generate variable values at the experiment level before the transaction
  // so the experimentConfig has the variableMap when it's written
  // TODO: Consider deferring experiment-level variable generation to first cohort
  // creation. This would allow users to fork an experiment, edit variable configs,
  // and then generate variables when the first cohort is created.
  experimentConfig.variableMap = await generateVariablesForScope(
    experimentConfig.variableConfigs ?? [],
    {scope: VariableScope.EXPERIMENT, experimentId: experimentConfig.id},
  );

  // Run document write as transaction to ensure consistency
  await firestore.runTransaction(async (transaction: Transaction) => {
    // Set the experiment document
    transaction.set(document, experimentConfig);

    // Add collection of stages
    for (const stage of template.stageConfigs) {
      transaction.set(document.collection('stages').doc(stage.id), stage);
    }

    // Add agent mediators under `agentMediators` collection
    for (const agent of template.agentMediators) {
      const persona = createAgentMediatorPersonaConfig(agent.persona);
      const doc = document.collection('agentMediators').doc(persona.id);
      transaction.set(doc, persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    }

    // Add agent participants under `agentParticipants` collection
    for (const agent of template.agentParticipants) {
      const persona = createAgentParticipantPersonaConfig(agent.persona);
      const doc = document.collection('agentParticipants').doc(persona.id);
      transaction.set(doc, persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    }
  });

  return document.id;
}

/**
 * Options for forking an experiment
 */
export interface ForkExperimentOptions {
  /** New name for the forked experiment. Defaults to "Copy of {sourceName}" */
  newName?: string;
  /** Firestore collection to write to. Defaults to 'experiments' */
  collectionName?: string;
}

/**
 * Result of forking an experiment
 */
export interface ForkExperimentResult {
  success: boolean;
  id?: string;
  error?: 'not-found' | 'access-denied';
}

/**
 * Fork an experiment by ID.
 *
 * This is the shared logic used by both:
 * - forkExperiment callable (UI experiment forking)
 * - forkExperiment REST API endpoint
 *
 * Access control: Only allows forking if:
 * - The experiment has visibility === PUBLIC, OR
 * - The requester is the creator/owner of the experiment
 *
 * @param firestore - Firestore instance
 * @param sourceExperimentId - The ID of the experiment to fork
 * @param experimenterId - The experimenter ID requesting the fork (also set as creator of fork)
 * @param options - Additional options
 * @returns Result with created experiment ID, or error if not found/access denied
 */
export async function forkExperimentById(
  firestore: Firestore,
  sourceExperimentId: string,
  experimenterId: string,
  options: ForkExperimentOptions = {},
): Promise<ForkExperimentResult> {
  const {collectionName = 'experiments', newName} = options;

  // Get full experiment data (stages, agents with prompts)
  const sourceData = await getExperimentDownload(
    firestore,
    sourceExperimentId,
    {
      includeParticipantData: false,
    },
  );

  if (!sourceData) {
    return {success: false, error: 'not-found'};
  }

  // Access check: only allow forking if public OR if requester is the owner
  const isPublic =
    sourceData.experiment.permissions?.visibility === Visibility.PUBLIC;
  const isOwner = sourceData.experiment.metadata?.creator === experimenterId;

  if (!isPublic && !isOwner) {
    return {success: false, error: 'access-denied'};
  }

  const timestamp = Timestamp.now() as UnifiedTimestamp;

  // Create new experiment with new ID
  const newId = generateId();
  const sourceName = sourceData.experiment.metadata?.name || 'Experiment';
  const forkName = newName || `Copy of ${sourceName}`;

  // Get stages in order
  const stageConfigs: StageConfig[] = [];
  for (const stageId of sourceData.experiment.stageIds || []) {
    const stage = sourceData.stageMap[stageId];
    if (stage) {
      stageConfigs.push(stage);
    }
  }

  // Convert agent maps to arrays
  const agentMediators = Object.values(sourceData.agentMediatorMap || {});
  const agentParticipants = Object.values(sourceData.agentParticipantMap || {});

  // Build experiment template for the fork
  const template = createExperimentTemplate({
    id: newId,
    experiment: {
      ...sourceData.experiment,
      id: newId,
      metadata: {
        ...sourceData.experiment.metadata,
        name: forkName,
        creator: experimenterId,
        starred: {},
        dateCreated: timestamp,
        dateModified: timestamp,
      },
    },
    stageConfigs,
    agentMediators,
    agentParticipants,
  });

  // Use shared utility to write experiment
  const createdId = await writeExperimentFromTemplate(
    firestore,
    template,
    experimenterId,
    {collectionName},
  );

  if (!createdId) {
    // This shouldn't happen since we generate a new ID, but handle it gracefully
    return {success: false, error: 'not-found'};
  }

  return {success: true, id: createdId};
}

/**
 * Options for updating an experiment
 */
export interface UpdateExperimentOptions {
  /** Firestore collection to update in. Defaults to 'experiments' */
  collectionName?: string;
}

/**
 * Result of updating an experiment
 */
export interface UpdateExperimentResult {
  success: boolean;
  error?: 'not-found' | 'not-owner';
}

/**
 * Update an experiment from a template.
 *
 * This is the shared logic used by both:
 * - updateExperiment callable (UI experiment updates)
 * - updateExperiment REST API endpoint
 *
 * @param firestore - Firestore instance
 * @param template - The experiment template containing experiment config, stages, and agents
 * @param experimenterId - The experimenter ID requesting the update (for ownership check)
 * @param options - Additional options
 * @returns Result indicating success or failure reason
 */
export async function updateExperimentFromTemplate(
  firestore: Firestore,
  template: ExperimentTemplate,
  experimenterId: string,
  options: UpdateExperimentOptions = {},
): Promise<UpdateExperimentResult> {
  const {collectionName = 'experiments'} = options;

  // Set up experiment config with stageIds
  const experimentConfig = createExperimentConfig(
    template.stageConfigs,
    template.experiment,
  );

  // Define document reference
  const document = firestore
    .collection(collectionName)
    .doc(experimentConfig.id);

  // Check if experiment exists
  const oldExperiment = await document.get();
  if (!oldExperiment.exists) {
    return {success: false, error: 'not-found'};
  }

  // Verify that the experimenter is the creator or an admin
  if (experimenterId !== oldExperiment.data()?.metadata.creator) {
    const isAdmin = await AuthGuard.isAdminEmail(firestore, experimenterId);

    if (!isAdmin) {
      return {success: false, error: 'not-owner'};
    }
  }

  // Preserve original dateCreated and creator, always update dateModified
  const oldData = oldExperiment.data();
  experimentConfig.metadata = createMetadataConfig({
    ...experimentConfig.metadata,
    creator: oldData?.metadata.creator,
    dateCreated: oldData?.metadata.dateCreated,
    dateModified: Timestamp.now() as UnifiedTimestamp,
  });

  // Regenerate variable values based on current variable configs
  experimentConfig.variableMap = await generateVariablesForScope(
    experimentConfig.variableConfigs ?? [],
    {scope: VariableScope.EXPERIMENT, experimentId: experimentConfig.id},
  );

  // NOTE: The recursiveDelete calls below are NOT part of the transaction.
  // They execute immediately and independently. If the transaction fails after
  // deletions occur, data may be lost. This is a known limitation of Firestore -
  // recursiveDelete cannot participate in transactions. In practice, transaction
  // failures after deletion are rare since the experiment doc is the conflict point.
  await firestore.runTransaction(async (transaction: Transaction) => {
    transaction.set(document, experimentConfig);

    // Clean up old stages, agents collections
    await firestore.recursiveDelete(document.collection('stages'));
    await firestore.recursiveDelete(document.collection('agents')); // legacy
    await firestore.recursiveDelete(document.collection('agentMediators'));
    await firestore.recursiveDelete(document.collection('agentParticipants'));

    // Add updated collection of stages
    for (const stage of template.stageConfigs) {
      transaction.set(document.collection('stages').doc(stage.id), stage);
    }

    // Add agent mediators under `agentMediators` collection
    for (const agent of template.agentMediators) {
      const persona = createAgentMediatorPersonaConfig(agent.persona);
      const doc = document.collection('agentMediators').doc(persona.id);
      transaction.set(doc, persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    }

    // Add agent participants under `agentParticipants` collection
    for (const agent of template.agentParticipants) {
      const persona = createAgentParticipantPersonaConfig(agent.persona);
      const doc = document.collection('agentParticipants').doc(persona.id);
      transaction.set(doc, persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    }
  });

  return {success: true};
}

/**
 * Options for deleting an experiment
 */
export interface DeleteExperimentOptions {
  /** Firestore collection to delete from. Defaults to 'experiments' */
  collectionName?: string;
}

/**
 * Result of deleting an experiment
 */
export interface DeleteExperimentResult {
  success: boolean;
  error?: 'not-found' | 'not-owner';
}

/**
 * Delete an experiment by ID.
 *
 * This is the shared logic used by both:
 * - deleteExperiment callable (UI experiment deletion)
 * - deleteExperiment REST API endpoint
 *
 * @param firestore - Firestore instance
 * @param experimentId - The ID of the experiment to delete
 * @param experimenterId - The experimenter ID requesting the deletion (for ownership check)
 * @param options - Additional options
 * @returns Result indicating success or failure reason
 */
export async function deleteExperimentById(
  firestore: Firestore,
  experimentId: string,
  experimenterId: string,
  options: DeleteExperimentOptions = {},
): Promise<DeleteExperimentResult> {
  const {collectionName = 'experiments'} = options;

  // Get experiment document
  const document = firestore.collection(collectionName).doc(experimentId);
  const experimentDoc = await document.get();

  // Check if experiment exists
  if (!experimentDoc.exists) {
    return {success: false, error: 'not-found'};
  }

  // Verify ownership or admin status
  const experiment = experimentDoc.data();
  if (experimenterId !== experiment?.metadata?.creator) {
    const isAdmin = await AuthGuard.isAdminEmail(firestore, experimenterId);

    if (!isAdmin) {
      return {success: false, error: 'not-owner'};
    }
  }

  // Delete experiment and all subcollections
  await firestore.recursiveDelete(document);

  return {success: true};
}
