/**
 * API endpoints for persona banks (Express version)
 *
 * Persona banks are experiment subcollections of pre-generated personas that
 * agents claim at spawn time: `personas` (agent persona bank) and
 * `repPersonas` (representative persona bank). There is no UI for uploading
 * them, so these endpoints are the way to install a bank on a deployment.
 */

import {Timestamp} from 'firebase-admin/firestore';
import {Response} from 'express';
import createHttpError from 'http-errors';
import {
  DeliberateLabAPIRequest,
  hasDeliberateLabAPIPermission,
  verifyExperimentAccess,
  verifyExperimentOwnership,
} from './dl_api.utils';
import {generateId} from '@deliberation-lab/utils';
import {StoredPersona} from '../persona_bank.utils';
import {app} from '../app';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

const PERSONA_COLLECTIONS = ['personas', 'repPersonas'] as const;
type PersonaCollection = (typeof PERSONA_COLLECTIONS)[number];

// Firestore batches take at most 500 writes; leave headroom.
const WRITE_BATCH_SIZE = 400;
// Cap one request at a few batches; larger banks upload in several requests.
const MAX_PERSONAS_PER_REQUEST = 2000;

interface UploadPersonasRequest {
  /** Which bank to write. Defaults to the agent persona bank. */
  collection?: PersonaCollection;
  /** Delete the existing bank documents before writing. */
  replace?: boolean;
  personas?: Partial<StoredPersona>[];
}

// ************************************************************************* //
// HELPERS                                                                   //
// ************************************************************************* //

function parseCollection(value: unknown): PersonaCollection {
  if (value === undefined || value === null || value === '') {
    return 'personas';
  }
  if (PERSONA_COLLECTIONS.includes(value as PersonaCollection)) {
    return value as PersonaCollection;
  }
  throw createHttpError(
    400,
    `Invalid persona collection; expected one of: ${PERSONA_COLLECTIONS.join(', ')}`,
  );
}

// ************************************************************************* //
// ENDPOINTS                                                                 //
// ************************************************************************* //

/**
 * List a persona bank (`?collection=personas|repPersonas`)
 */
export async function listPersonas(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'read')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimentId = req.params.experimentId;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    throw createHttpError(400, 'Experiment ID required');
  }

  await verifyExperimentAccess(experimentId, experimenterId);
  const collection = parseCollection(req.query.collection);

  const snapshot = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection(collection)
    .get();

  const personas = snapshot.docs.map((doc) => doc.data());

  res.status(200).json({
    collection,
    personas,
    total: personas.length,
  });
}

/**
 * Upload persona bank documents (optionally replacing the existing bank)
 */
export async function uploadPersonas(
  req: DeliberateLabAPIRequest,
  res: Response,
): Promise<void> {
  if (!hasDeliberateLabAPIPermission(req, 'write')) {
    throw createHttpError(403, 'Insufficient permissions');
  }

  const experimentId = req.params.experimentId;
  const experimenterId = req.deliberateLabAPIKeyData!.experimenterId;

  if (!experimentId) {
    throw createHttpError(400, 'Experiment ID required');
  }

  // Only the experiment creator can modify its banks.
  await verifyExperimentOwnership(experimentId, experimenterId);

  const body = req.body as UploadPersonasRequest;
  const collection = parseCollection(body.collection);

  if (!Array.isArray(body.personas) || body.personas.length === 0) {
    throw createHttpError(400, 'personas must be a non-empty array');
  }
  if (body.personas.length > MAX_PERSONAS_PER_REQUEST) {
    throw createHttpError(
      400,
      `At most ${MAX_PERSONAS_PER_REQUEST} personas per request; upload larger banks in several requests`,
    );
  }

  // Normalize documents: fill the bookkeeping fields the claim logic reads,
  // keep any experiment-defined fields as-is.
  const now = Timestamp.now();
  const docs: StoredPersona[] = body.personas.map((persona, index) => {
    if (persona === null || typeof persona !== 'object') {
      throw createHttpError(400, `personas[${index}] must be an object`);
    }
    const id =
      typeof persona.id === 'string' && persona.id !== ''
        ? persona.id
        : generateId();
    for (const [field, expected] of [
      ['hash', 'string'],
      ['content', 'string'],
      ['sketch', 'string'],
      ['usageCount', 'number'],
    ] as const) {
      if (persona[field] !== undefined && typeof persona[field] !== expected) {
        throw createHttpError(
          400,
          `personas[${index}].${field} must be a ${expected}`,
        );
      }
    }
    if (persona.usedBy !== undefined && !Array.isArray(persona.usedBy)) {
      throw createHttpError(400, `personas[${index}].usedBy must be an array`);
    }
    return {
      ...persona,
      id,
      hash: persona.hash ?? '',
      variables: persona.variables ?? {},
      usageCount: persona.usageCount ?? 0,
      usedBy: persona.usedBy ?? [],
      createdAt: persona.createdAt ?? now,
    } as StoredPersona;
  });

  const ids = new Set(docs.map((doc) => doc.id));
  if (ids.size !== docs.length) {
    throw createHttpError(400, 'personas contain duplicate ids');
  }

  const collectionRef = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection(collection);

  let removed = 0;
  if (body.replace) {
    const existing = await collectionRef.get();
    removed = existing.size;
    for (let i = 0; i < existing.docs.length; i += WRITE_BATCH_SIZE) {
      const batch = app.firestore().batch();
      for (const doc of existing.docs.slice(i, i + WRITE_BATCH_SIZE)) {
        batch.delete(doc.ref);
      }
      await batch.commit();
    }
  }

  for (let i = 0; i < docs.length; i += WRITE_BATCH_SIZE) {
    const batch = app.firestore().batch();
    for (const doc of docs.slice(i, i + WRITE_BATCH_SIZE)) {
      batch.set(collectionRef.doc(doc.id), doc);
    }
    await batch.commit();
  }

  res.status(201).json({
    collection,
    written: docs.length,
    removed,
  });
}
