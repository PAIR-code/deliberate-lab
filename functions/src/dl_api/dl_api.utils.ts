/**
 * Shared utilities for Deliberate Lab REST API endpoints
 * Includes authentication middleware and validation helpers
 */

import {Request, Response, NextFunction} from 'express';
import createHttpError from 'http-errors';
import {Experiment} from '@deliberation-lab/utils';
import {
  verifyDeliberateLabAPIKey,
  extractDeliberateLabBearerToken,
} from './dl_api_key.utils';
import {getFirestoreExperiment} from '../utils/firestore';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface DeliberateLabAPIRequest extends Request {
  deliberateLabAPIKeyData?: {
    experimenterId: string;
    permissions: string[];
    name: string;
  };
}

// ************************************************************************* //
// AUTHENTICATION MIDDLEWARE                                                 //
// ************************************************************************* //

/**
 * Middleware to reject browser requests for Deliberate Lab API (server-to-server only)
 * Allows localhost in development for Swagger UI testing
 */
export function rejectBrowserRequestsForDeliberateLabAPI(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    // Allow localhost/127.0.0.1 origins for local development
    const isLocalhost =
      origin.includes('localhost') || origin.includes('127.0.0.1');
    if (!isLocalhost) {
      res.status(403).json({
        error:
          'Browser access not allowed. Use API keys from server-side applications only.',
      });
      return;
    }
  }
  next();
}

/**
 * Async middleware wrapper for cleaner error handling
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express middleware to authenticate Deliberate Lab API key
 * Simplified async version using Express patterns
 */
export const authenticateDeliberateLabAPIKey = asyncHandler(
  async (req: DeliberateLabAPIRequest, res: Response, next: NextFunction) => {
    // Extract and validate Bearer token
    const apiKey = extractDeliberateLabBearerToken(req.headers.authorization);

    if (!apiKey) {
      const error = req.headers.authorization
        ? 'Invalid Authorization header format. Use: Authorization: Bearer YOUR_API_KEY'
        : 'Missing Authorization header. Use: Authorization: Bearer YOUR_API_KEY';

      res.status(401).json({error});
      return;
    }

    try {
      // Verify API key
      const {valid, data} = await verifyDeliberateLabAPIKey(apiKey);

      if (!valid || !data) {
        res.status(401).json({error: 'Invalid or expired API key'});
        return;
      }

      // Attach API key data to request
      req.deliberateLabAPIKeyData = {
        experimenterId: data.experimenterId,
        permissions: data.permissions,
        name: data.name,
      };

      next();
    } catch (error) {
      console.error('Error verifying API key:', error);
      res
        .status(500)
        .json({error: 'Internal server error during authentication'});
    }
  },
);

/**
 * Check if the Deliberate Lab API key has a specific permission
 */
export function hasDeliberateLabAPIPermission(
  req: DeliberateLabAPIRequest,
  permission: string,
): boolean {
  return (
    req.deliberateLabAPIKeyData?.permissions?.includes(permission) ?? false
  );
}

/**
 * Express middleware to check for a specific Deliberate Lab API permission
 */
export function requireDeliberateLabAPIPermission(permission: string) {
  return (
    req: DeliberateLabAPIRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!hasDeliberateLabAPIPermission(req, permission)) {
      res.status(403).json({
        error: `Insufficient permissions. Required: ${permission}`,
      });
      return;
    }
    next();
  };
}

// ************************************************************************* //
// EXPERIMENT ACCESS HELPERS                                                 //
// ************************************************************************* //

/**
 * Verify the authenticated user has read access to the experiment.
 * Returns the experiment if access is granted.
 * Throws HttpError if experiment not found or access denied.
 */
export async function verifyExperimentAccess(
  experimentId: string,
  experimenterId: string,
): Promise<Experiment> {
  const experiment = await getFirestoreExperiment(experimentId);
  if (!experiment) {
    throw createHttpError(404, 'Experiment not found');
  }

  if (
    experiment.metadata.creator !== experimenterId &&
    !experiment.permissions?.readers?.includes(experimenterId)
  ) {
    throw createHttpError(403, 'Access denied');
  }

  return experiment;
}

/**
 * Verify the authenticated user is the creator/owner of the experiment.
 * Returns the experiment if ownership is verified.
 * Throws HttpError if experiment not found or not owner.
 */
export async function verifyExperimentOwnership(
  experimentId: string,
  experimenterId: string,
): Promise<Experiment> {
  const experiment = await getFirestoreExperiment(experimentId);
  if (!experiment) {
    throw createHttpError(404, 'Experiment not found');
  }

  if (experiment.metadata.creator !== experimenterId) {
    throw createHttpError(
      403,
      'Only the experiment creator can perform this action',
    );
  }

  return experiment;
}
