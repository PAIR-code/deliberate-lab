/**
 * API endpoints for experiment management (Express version)
 */

import * as admin from 'firebase-admin';
import {Response} from 'express';
import {
  DeliberateLabAPIRequest,
  hasDeliberateLabAPIPermission,
  validateOrRespond,
} from './dl_api.utils';
import {
  createExperimentConfig,
  StageConfig,
  MetadataConfig,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';
import {
  getFirestoreExperiment,
  getFirestoreExperimentRef,
} from '../utils/firestore';
import {validateStages} from '../utils/validation';
import {getExperimentDownload} from '../data';

// Use simplified schemas for the REST API
// The full ExperimentCreationData schema is for the internal endpoints
interface CreateExperimentRequest {
  name: string;
  description?: string;
  stages?: StageConfig[];
  prolificRedirectCode?: string;
}

interface UpdateExperimentRequest {
  name?: string;
  description?: string;
  stages?: StageConfig[];
  prolificRedirectCode?: string;
}

/**
 * List experiments for the authenticated user
 */
export async function listExperiments(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'read')) {
    res.status(403).json({error: 'Insufficient permissions'});
    return;
  }

  const app = admin.app();
  const firestore = app.firestore();
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  try {
    // Get experiments where user is creator or has read access
    const snapshot = await firestore
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
  } catch (error) {
    console.error('Error listing experiments:', error);
    res.status(500).json({error: 'Failed to list experiments'});
  }
}

/**
 * Create a new experiment
 */
export async function createExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    res.status(403).json({error: 'Insufficient permissions'});
    return;
  }

  const app = admin.app();
  const firestore = app.firestore();
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  try {
    const body = req.body as CreateExperimentRequest;

    // Basic validation
    if (!body.name) {
      res.status(400).json({
        error: 'Invalid request body: name is required',
      });
      return;
    }

    const timestamp = admin.firestore.Timestamp.now() as UnifiedTimestamp;

    // Use existing utility functions to create proper config
    const metadata: MetadataConfig & {prolificRedirectCode?: string} = {
      name: body.name,
      description: body.description || '',
      publicName: '',
      tags: [],
      creator: experimenterId,
      starred: {},
      dateCreated: timestamp,
      dateModified: timestamp,
    };

    // Add prolific redirect code if provided
    if (body.prolificRedirectCode) {
      metadata.prolificRedirectCode = body.prolificRedirectCode;
    }

    // Validate stages if provided
    if (!validateOrRespond(body.stages, validateStages, res)) return;

    // Create experiment config with stages (if provided)
    const stageConfigs = body.stages || [];
    const experimentConfig = createExperimentConfig(stageConfigs, {
      metadata,
    });

    // Use transaction for consistency (similar to writeExperiment)
    await firestore.runTransaction(async (transaction) => {
      const experimentRef = firestore
        .collection('experiments')
        .doc(experimentConfig.id);

      // Check if experiment already exists
      const existingDoc = await transaction.get(experimentRef);
      if (existingDoc.exists) {
        throw new Error('Experiment with this ID already exists');
      }

      // Set the experiment document
      transaction.set(experimentRef, experimentConfig);

      // Add stages subcollection if stages provided
      for (const stage of stageConfigs) {
        transaction.set(
          experimentRef.collection('stages').doc(stage.id),
          stage,
        );
      }
    });

    res.status(201).json({
      ...experimentConfig,
      id: experimentConfig.id,
    });
  } catch (error) {
    console.error('Error creating experiment:', error);
    res.status(500).json({error: 'Failed to create experiment'});
  }
}

/**
 * Get a specific experiment
 */
export async function getExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'read')) {
    res.status(403).json({error: 'Insufficient permissions'});
    return;
  }

  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    res.status(400).json({error: 'Experiment ID required'});
    return;
  }

  const app = admin.app();
  const firestore = app.firestore();

  try {
    // First fetch just the experiment to check permissions (lightweight)
    const experiment = await getFirestoreExperiment(experimentId);
    if (!experiment) {
      res.status(404).json({error: 'Experiment not found'});
      return;
    }

    // Check access permissions before fetching full data
    if (
      experiment.metadata.creator !== experimenterId &&
      !experiment.permissions?.readers?.includes(experimenterId)
    ) {
      res.status(403).json({error: 'Access denied'});
      return;
    }

    // Now fetch full experiment data (stages, agents, etc.)
    const data = await getExperimentDownload(firestore, experimentId, {
      includeParticipantData: false,
    });

    if (!data) {
      res.status(500).json({error: 'Failed to load experiment data'});
      return;
    }

    res.status(200).json({
      experiment: {...data.experiment, id: experimentId},
      stageMap: data.stageMap,
      agentMediatorMap: data.agentMediatorMap,
      agentParticipantMap: data.agentParticipantMap,
    });
  } catch (error) {
    console.error('Error getting experiment:', error);
    res.status(500).json({error: 'Failed to get experiment'});
  }
}

/**
 * Update an experiment
 */
export async function updateExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    res.status(403).json({error: 'Insufficient permissions'});
    return;
  }

  const app = admin.app();
  const firestore = app.firestore();
  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    res.status(400).json({error: 'Experiment ID required'});
    return;
  }

  try {
    const body = req.body as UpdateExperimentRequest;

    // Use existing utility to get experiment
    const experiment = await getFirestoreExperiment(experimentId);
    if (!experiment) {
      res.status(404).json({error: 'Experiment not found'});
      return;
    }

    // Check ownership
    if (experiment.metadata.creator !== experimenterId) {
      res
        .status(403)
        .json({error: 'Only the creator can update the experiment'});
      return;
    }

    // Build update object for metadata fields
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates['metadata.name'] = body.name;
    if (body.description !== undefined)
      updates['metadata.description'] = body.description;
    if (body.prolificRedirectCode !== undefined) {
      updates['metadata.prolificRedirectCode'] = body.prolificRedirectCode;
    }

    // Update timestamp
    updates['metadata.dateModified'] = admin.firestore.Timestamp.now();

    // Validate stages if provided
    if (!validateOrRespond(body.stages, validateStages, res)) return;

    // Use transaction if stages need updating
    if (body.stages !== undefined) {
      await firestore.runTransaction(async (transaction) => {
        const experimentRef = getFirestoreExperimentRef(experimentId);

        // Update experiment metadata
        transaction.update(experimentRef, updates);

        // Clean up old stages
        const oldStageCollection = experimentRef.collection('stages');
        const oldStages = await oldStageCollection.get();
        oldStages.forEach((doc) => transaction.delete(doc.ref));

        // Add new stages and update stageIds
        const stageIds: string[] = [];
        for (const stage of body.stages || []) {
          const stageRef = experimentRef
            .collection('stages')
            .doc(stage.id || experimentRef.collection('stages').doc().id);
          transaction.set(stageRef, stage);
          stageIds.push(stageRef.id);
        }

        transaction.update(experimentRef, {stageIds});
      });
    } else {
      // Simple update without stages
      await getFirestoreExperimentRef(experimentId).update(updates);
    }

    res.status(200).json({
      updated: true,
      id: experimentId,
    });
  } catch (error) {
    console.error('Error updating experiment:', error);
    res.status(500).json({error: 'Failed to update experiment'});
  }
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    res.status(403).json({error: 'Insufficient permissions'});
    return;
  }

  const app = admin.app();
  const firestore = app.firestore();
  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    res.status(400).json({error: 'Experiment ID required'});
    return;
  }

  try {
    // Use existing utility to get experiment
    const experiment = await getFirestoreExperiment(experimentId);
    if (!experiment) {
      res.status(404).json({error: 'Experiment not found'});
      return;
    }

    // Check ownership
    if (experiment.metadata.creator !== experimenterId) {
      res
        .status(403)
        .json({error: 'Only the creator can delete the experiment'});
      return;
    }

    // Use Firebase's recursive delete to properly clean up all subcollections
    // This handles stages, cohorts, participants, and all nested data
    const experimentRef = getFirestoreExperimentRef(experimentId);
    await firestore.recursiveDelete(experimentRef);

    res.status(200).json({
      id: experimentId,
      deleted: true,
    });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    res.status(500).json({error: 'Failed to delete experiment'});
  }
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
    res.status(403).json({error: 'Insufficient permissions'});
    return;
  }

  const app = admin.app();
  const firestore = app.firestore();
  const experimentId = req.params.id;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    res.status(400).json({error: 'Experiment ID required'});
    return;
  }

  try {
    // First check permissions using existing utility
    const experiment = await getFirestoreExperiment(experimentId);
    if (!experiment) {
      res.status(404).json({error: 'Experiment not found'});
      return;
    }

    // Check access permissions
    if (
      experiment.metadata.creator !== experimenterId &&
      !experiment.permissions?.readers?.includes(experimenterId)
    ) {
      res.status(403).json({error: 'Access denied'});
      return;
    }

    // Use the shared function to get full experiment data
    const experimentDownload = await getExperimentDownload(
      firestore,
      experimentId,
    );

    if (!experimentDownload) {
      res.status(500).json({error: 'Failed to load experiment data'});
      return;
    }

    // Format response based on query parameter
    const format = req.query.format || 'json';

    if (format === 'json') {
      res.status(200).json(experimentDownload);
    } else {
      res.status(400).json({error: 'Unsupported format. Use format=json'});
    }
  } catch (error) {
    console.error('Error exporting experiment data:', error);
    res.status(500).json({error: 'Failed to export experiment data'});
  }
}
