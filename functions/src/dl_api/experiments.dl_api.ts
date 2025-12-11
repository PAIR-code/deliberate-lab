/**
 * API endpoints for experiment management (Express version)
 */

import {Response} from 'express';
import createHttpError from 'http-errors';
import {app} from '../app';
import {
  DeliberateLabAPIRequest,
  hasDeliberateLabAPIPermission,
  verifyExperimentAccess,
} from './dl_api.utils';
import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentMediatorTemplate,
  AgentParticipantTemplate,
  createExperimentConfig,
  createExperimentTemplate,
  Experiment,
  ExperimentTemplate,
  MetadataConfig,
  StageConfig,
  ProlificConfig,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';
import {getFirestoreExperimentRef} from '../utils/firestore';
import {getExperimentDownload} from '../data';
import {
  deleteExperimentById,
  forkExperimentById,
  updateExperimentFromTemplate,
  writeExperimentFromTemplate,
} from '../experiment.utils';

// Use simplified schemas for the REST API
// The full ExperimentCreationData schema is for the internal endpoints
interface CreateExperimentRequest {
  /** For simple creation: experiment name (required unless template provided) */
  name?: string;
  /** For simple creation: experiment description */
  description?: string;
  /** For simple creation: stage configurations */
  stages?: StageConfig[];
  /** For simple creation: Prolific integration config */
  prolificConfig?: ProlificConfig;
  /** For simple creation: agent mediator configurations */
  agentMediators?: AgentMediatorTemplate[];
  /** For simple creation: agent participant configurations */
  agentParticipants?: AgentParticipantTemplate[];
  /**
   * For full template creation: provide a complete ExperimentTemplate.
   * When provided, creates experiment with all stages and agents.
   * Other fields (name, description, etc.) are ignored.
   */
  template?: ExperimentTemplate;
}

interface UpdateExperimentRequest {
  /** For partial updates: update just the name */
  name?: string;
  /** For partial updates: update just the description */
  description?: string;
  /** For partial updates: replace all stages */
  stages?: StageConfig[];
  /** For partial updates: update prolific config */
  prolificConfig?: ProlificConfig;
  /** For partial updates: replace all agent mediators */
  agentMediators?: AgentMediatorTemplate[];
  /** For partial updates: replace all agent participants */
  agentParticipants?: AgentParticipantTemplate[];
  /**
   * For full template updates: provide a complete ExperimentTemplate.
   * When provided, this replaces the entire experiment config including
   * all stages and agents. Other fields (name, description, etc.) are ignored.
   */
  template?: ExperimentTemplate;
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
 *
 * Supports two modes:
 * 1. Simple creation: Provide name, description, stages, prolificConfig
 * 2. Full template creation: Provide a complete ExperimentTemplate
 *
 * When `template` is provided, it creates the experiment with all stages and agents.
 * This uses the same logic as the UI's writeExperiment callable.
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

  // If a full template is provided, use the shared utility
  if (body.template) {
    const experimentId = await writeExperimentFromTemplate(
      app.firestore(),
      body.template,
      experimenterId,
    );

    if (!experimentId) {
      throw createHttpError(409, 'Experiment with this ID already exists');
    }

    // Fetch the created experiment to return full config
    const experimentDoc = await getFirestoreExperimentRef(experimentId).get();
    const experimentConfig = experimentDoc.data() as Experiment;

    res.status(201).json({
      experiment: {...experimentConfig, id: experimentId},
    });
    return;
  }

  // Simple creation mode: name is required
  if (!body.name) {
    throw createHttpError(
      400,
      'Invalid request body: name is required (or provide template)',
    );
  }

  // Build experiment config from simple inputs
  const stageConfigs = body.stages || [];
  const timestamp = Timestamp.now() as UnifiedTimestamp;
  const metadata: MetadataConfig = {
    name: body.name,
    description: body.description || '',
    publicName: '',
    tags: [],
    creator: '', // Will be set by writeExperimentFromTemplate
    starred: {},
    dateCreated: timestamp,
    dateModified: timestamp,
  };
  const experimentConfig = createExperimentConfig(stageConfigs, {
    metadata,
    prolificConfig: body.prolificConfig,
  });

  // Build template from simple inputs
  const template = createExperimentTemplate({
    id: experimentConfig.id,
    experiment: experimentConfig,
    stageConfigs,
    agentMediators: body.agentMediators || [],
    agentParticipants: body.agentParticipants || [],
  });

  // Use shared utility to write experiment
  const experimentId = await writeExperimentFromTemplate(
    app.firestore(),
    template,
    experimenterId,
  );

  if (!experimentId) {
    throw createHttpError(409, 'Experiment with this ID already exists');
  }

  // Fetch the created experiment to return full config
  const experimentDoc = await getFirestoreExperimentRef(experimentId).get();
  const createdExperiment = experimentDoc.data() as Experiment;

  res.status(201).json({
    experiment: {...createdExperiment, id: experimentId},
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
 *
 * Supports two modes:
 * 1. Partial update: Provide individual fields (name, description, stages, prolificConfig)
 * 2. Full template update: Provide a complete ExperimentTemplate in the `template` field
 *
 * When `template` is provided, it replaces the entire experiment including all stages
 * and agents. This uses the same logic as the UI's updateExperiment callable.
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

  // If a full template is provided, use the shared utility for full replacement
  if (body.template) {
    // Ensure the template's experiment ID matches the URL parameter
    if (
      body.template.experiment.id &&
      body.template.experiment.id !== experimentId
    ) {
      throw createHttpError(
        400,
        'Template experiment ID does not match URL parameter',
      );
    }
    // Set the ID in case it wasn't provided
    body.template.experiment.id = experimentId;

    const result = await updateExperimentFromTemplate(
      app.firestore(),
      body.template,
      experimenterId,
    );

    if (!result.success) {
      if (result.error === 'not-found') {
        throw createHttpError(404, 'Experiment not found');
      } else if (result.error === 'not-owner') {
        throw createHttpError(
          403,
          'Only the creator can update the experiment',
        );
      }
    }

    res.status(200).json({
      updated: true,
      id: experimentId,
    });
    return;
  }

  // Partial update mode: fetch existing data and merge updates
  // This ensures all Firestore logic is unified in the shared utility
  const existingData = await getExperimentDownload(
    app.firestore(),
    experimentId,
    {
      includeParticipantData: false,
    },
  );

  if (!existingData) {
    throw createHttpError(404, 'Experiment not found');
  }

  const existingExperiment = existingData.experiment;

  // Verify ownership before proceeding
  if (existingExperiment.metadata.creator !== experimenterId) {
    throw createHttpError(403, 'Only the creator can update the experiment');
  }

  // Merge partial updates into existing experiment
  const mergedExperiment: Experiment = {
    ...existingExperiment,
    id: experimentId,
    metadata: {
      ...existingExperiment.metadata,
      ...(body.name !== undefined && {name: body.name}),
      ...(body.description !== undefined && {description: body.description}),
    },
    ...(body.prolificConfig !== undefined && {
      prolificConfig: body.prolificConfig,
    }),
  };

  // Get stages: use provided stages or existing stages
  let stageConfigs: StageConfig[];
  if (body.stages !== undefined) {
    stageConfigs = body.stages;
  } else {
    // Get existing stages in order
    stageConfigs = [];
    for (const stageId of existingExperiment.stageIds || []) {
      const stage = existingData.stageMap[stageId];
      if (stage) {
        stageConfigs.push(stage);
      }
    }
  }

  // Get agents: use provided or existing
  const agentMediators =
    body.agentMediators !== undefined
      ? body.agentMediators
      : Object.values(existingData.agentMediatorMap || {});

  const agentParticipants =
    body.agentParticipants !== undefined
      ? body.agentParticipants
      : Object.values(existingData.agentParticipantMap || {});

  // Build template from merged data
  const template = createExperimentTemplate({
    id: experimentId,
    experiment: mergedExperiment,
    stageConfigs,
    agentMediators,
    agentParticipants,
  });

  // Use shared utility to update experiment
  const result = await updateExperimentFromTemplate(
    app.firestore(),
    template,
    experimenterId,
  );

  if (!result.success) {
    if (result.error === 'not-found') {
      throw createHttpError(404, 'Experiment not found');
    } else if (result.error === 'not-owner') {
      throw createHttpError(403, 'Only the creator can update the experiment');
    }
  }

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

  // Use shared utility to delete experiment
  const result = await deleteExperimentById(
    app.firestore(),
    experimentId,
    experimenterId,
  );

  if (!result.success) {
    if (result.error === 'not-found') {
      throw createHttpError(404, 'Experiment not found');
    } else if (result.error === 'not-owner') {
      throw createHttpError(403, 'Only the experiment creator can delete');
    }
  }

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

/**
 * Fork an experiment
 * Creates a copy of the experiment with all stages and agents
 *
 * Access: Only public experiments or experiments owned by the requester can be forked
 */
export async function forkExperiment(
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

  // forkExperimentById handles access checks internally
  const result = await forkExperimentById(
    app.firestore(),
    experimentId,
    experimenterId,
    {newName: req.body?.name},
  );

  if (!result.success) {
    if (result.error === 'not-found') {
      throw createHttpError(404, 'Experiment not found');
    } else if (result.error === 'access-denied') {
      throw createHttpError(
        403,
        'Cannot fork this experiment. Only public experiments or your own experiments can be forked.',
      );
    }
  }

  // Fetch the created experiment to return full config
  const newExperimentDoc = await getFirestoreExperimentRef(result.id!).get();
  const newExperimentConfig = newExperimentDoc.data() as Experiment;

  res.status(201).json({
    experiment: {...newExperimentConfig, id: result.id},
    sourceExperimentId: experimentId,
  });
}
