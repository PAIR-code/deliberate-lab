/**
 * API endpoints for experiment management (Express version)
 */

import {Timestamp} from 'firebase-admin/firestore';
import {Response} from 'express';
import createHttpError from 'http-errors';
import {app} from '../app';
import {
  DeliberateLabAPIRequest,
  hasDeliberateLabAPIPermission,
  verifyExperimentAccess,
  verifyExperimentOwnership,
} from './dl_api.utils';
import {
  createExperimentConfig,
  Experiment,
  StageConfig,
  MetadataConfig,
  UnifiedTimestamp,
  ProlificConfig,
} from '@deliberation-lab/utils';
import {getFirestoreExperimentRef} from '../utils/firestore';
import {validateStages} from '../utils/validation';
import {getExperimentDownload} from '../data';

// Use simplified schemas for the REST API
// The full ExperimentCreationData schema is for the internal endpoints
interface CreateExperimentRequest {
  name: string;
  description?: string;
  stages?: StageConfig[];
  prolificConfig?: ProlificConfig;
}

interface UpdateExperimentRequest {
  name?: string;
  description?: string;
  stages?: StageConfig[];
  prolificConfig?: ProlificConfig;
}

/**
 * List experiments for the authenticated user
 */
export async function listExperiments(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'read')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  // Get experiments where user is creator or has read access
  const snapshot = await app
    .firestore()
    .collection('experiments')
    .where('metadata.creator', '==', experimenterId)
    .get();

  const experiments = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.status(200).json({
    experiments,
    total: experiments.length,
  });
}

/**
 * Create a new experiment
 */
export async function createExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  const body = req.body as CreateExperimentRequest;

  // Basic validation
  if (!body.name) {
    throw createHttpError(400, 'Invalid request body: name is required');
  }

  const timestamp = Timestamp.now() as UnifiedTimestamp;

  // Use existing utility functions to create proper config
  const metadata: MetadataConfig = {
    name: body.name,
    description: body.description || '',
    publicName: '',
    tags: [],
    creator: experimenterId,
    starred: {},
    dateCreated: timestamp,
    dateModified: timestamp,
  };

  // Validate stages if provided
  if (body.stages !== undefined) {
    const stagesValidation = validateStages(body.stages);
    if (!stagesValidation.valid) {
      throw createHttpError(400, stagesValidation.error);
    }
  }

  // Create experiment config with stages (if provided)
  const stageConfigs = body.stages || [];
  const experimentConfig = createExperimentConfig(stageConfigs, {
    metadata,
    prolificConfig: body.prolificConfig,
  });

  // Use transaction for consistency (similar to writeExperiment)
  await app.firestore().runTransaction(async (transaction) => {
    const experimentRef = getFirestoreExperimentRef(experimentConfig.id);

    // Check if experiment already exists
    const existingDoc = await transaction.get(experimentRef);
    if (existingDoc.exists) {
      throw createHttpError(409, 'Experiment with this ID already exists');
    }

    // Set the experiment document
    transaction.set(experimentRef, experimentConfig);

    // Add stages subcollection if stages provided
    for (const stage of stageConfigs) {
      transaction.set(experimentRef.collection('stages').doc(stage.id), stage);
    }
  });

  res.status(201).json({
    experiment: experimentConfig,
  });
}

/**
 * Get a specific experiment
 */
export async function getExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'read')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    throw createHttpError(400, 'Experiment ID required');
  }

  // Verify access permissions before fetching full data
  await verifyExperimentAccess(experimentId, experimenterId);

  // Now fetch full experiment data (stages, agents, etc.)
  const data = await getExperimentDownload(app.firestore(), experimentId, {
    includeParticipantData: false,
  });

  if (!data) {
    throw createHttpError(500, 'Failed to load experiment data');
  }

  res.status(200).json({
    experiment: {...data.experiment, id: experimentId},
    stageMap: data.stageMap,
    agentMediatorMap: data.agentMediatorMap,
    agentParticipantMap: data.agentParticipantMap,
  });
}

/**
 * Update an experiment
 */
export async function updateExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    throw createHttpError(400, 'Experiment ID required');
  }

  const body = req.body as UpdateExperimentRequest;

  // Build update object for metadata fields
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates['metadata.name'] = body.name;
  if (body.description !== undefined)
    updates['metadata.description'] = body.description;
  if (body.prolificConfig !== undefined) {
    updates['prolificConfig'] = body.prolificConfig;
  }

  // Update timestamp
  updates['metadata.dateModified'] = Timestamp.now();

  // Run all checks and updates in a transaction for consistency
  await app.firestore().runTransaction(async (transaction) => {
    const experimentRef = getFirestoreExperimentRef(experimentId);

    // Check existence and ownership inside transaction
    const experimentDoc = await transaction.get(experimentRef);
    if (!experimentDoc.exists) {
      throw createHttpError(404, 'Experiment not found');
    }

    const experiment = experimentDoc.data() as Experiment;
    if (experiment.metadata.creator !== experimenterId) {
      throw createHttpError(403, 'Only the creator can update the experiment');
    }

    // Validate stages if provided
    if (body.stages !== undefined) {
      const stagesValidation = validateStages(body.stages);
      if (!stagesValidation.valid) {
        throw createHttpError(400, stagesValidation.error);
      }
    }

    // Update experiment metadata
    transaction.update(experimentRef, updates);

    // Update stages if provided
    if (body.stages !== undefined) {
      // Delete old stages using stageIds from experiment
      const oldStageIds = experiment.stageIds || [];
      for (const stageId of oldStageIds) {
        transaction.delete(experimentRef.collection('stages').doc(stageId));
      }

      // Add new stages and update stageIds
      const stageIds: string[] = [];
      for (const stage of body.stages) {
        const stageRef = experimentRef
          .collection('stages')
          .doc(stage.id || experimentRef.collection('stages').doc().id);
        transaction.set(stageRef, stage);
        stageIds.push(stageRef.id);
      }

      transaction.update(experimentRef, {stageIds});
    }
  });

  res.status(200).json({
    updated: true,
    id: experimentId,
  });
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    throw createHttpError(400, 'Experiment ID required');
  }

  // Verify ownership before deleting
  await verifyExperimentOwnership(experimentId, experimenterId);

  // Use Firebase's recursive delete to properly clean up all subcollections
  // This handles stages, cohorts, participants, and all nested data
  const experimentRef = getFirestoreExperimentRef(experimentId);
  await app.firestore().recursiveDelete(experimentRef);

  res.status(200).json({
    id: experimentId,
    deleted: true,
  });
}

/**
 * Export experiment data
 * Returns comprehensive ExperimentDownload structure with all related data
 */
export async function exportExperimentData(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'read')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    throw createHttpError(400, 'Experiment ID required');
  }

  // Verify access permissions
  await verifyExperimentAccess(experimentId, experimenterId);

  // Use the shared function to get full experiment data
  const experimentDownload = await getExperimentDownload(
    app.firestore(),
    experimentId,
  );

  if (!experimentDownload) {
    throw createHttpError(500, 'Failed to load experiment data');
  }

  // Format response based on query parameter
  const format = req.query.format || 'json';

  if (format !== 'json') {
    throw createHttpError(400, 'Unsupported format. Use format=json');
  }

  res.status(200).json(experimentDownload);
}
