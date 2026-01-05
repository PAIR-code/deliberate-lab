/**
 * Main REST API endpoint for Deliberate Lab (Express version)
 * Server-to-server API with API key authentication
 */

import {onRequest, onCall} from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import express from 'express';
import rateLimit, {ipKeyGenerator} from 'express-rate-limit';
import {
  authenticateDeliberateLabAPIKey,
  rejectBrowserRequestsForDeliberateLabAPI,
} from './dl_api.utils';
import {AuthGuard} from '../utils/auth-guard';
import {DeliberateLabAPIKeyPermission} from '@deliberation-lab/utils';
import * as deliberateLabAPIKeyService from './dl_api_key.utils';
import {
  listExperiments,
  createExperiment,
  getExperiment,
  updateExperiment,
  deleteExperiment,
  exportExperimentData,
  forkExperiment,
} from './experiments.dl_api';
import {
  listCohorts,
  createCohort,
  getCohort,
  updateCohort,
  deleteCohort,
} from './cohorts.dl_api';

// Create Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP/API key to 100 requests per windowMs
  message: 'Too many requests from this API key, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use API key as identifier for rate limiting
  keyGenerator: (req) => {
    // Use shared utility to extract API key
    const apiKey = deliberateLabAPIKeyService.extractDeliberateLabBearerToken(
      req.headers.authorization,
    );
    // Use API key if found, otherwise fall back to properly normalized IP
    return apiKey || ipKeyGenerator(req.ip || 'unknown');
  },
});

// Apply middleware in order:
// 1. Rate limiting
app.use(limiter);

// 2. Reject browser requests (server-to-server only)
app.use(rejectBrowserRequestsForDeliberateLabAPI);

// 3. Authenticate API key
app.use(authenticateDeliberateLabAPIKey);

// API Routes - Experiments
app.get('/v1/experiments', listExperiments);
app.post('/v1/experiments', createExperiment);
app.get('/v1/experiments/:id', getExperiment);
app.put('/v1/experiments/:id', updateExperiment);
app.delete('/v1/experiments/:id', deleteExperiment);
app.get('/v1/experiments/:id/export', exportExperimentData);
app.post('/v1/experiments/:id/fork', forkExperiment);

// API Routes - Cohorts (nested under experiments)
app.get('/v1/experiments/:experimentId/cohorts', listCohorts);
app.post('/v1/experiments/:experimentId/cohorts', createCohort);
app.get('/v1/experiments/:experimentId/cohorts/:cohortId', getCohort);
app.put('/v1/experiments/:experimentId/cohorts/:cohortId', updateCohort);
app.delete('/v1/experiments/:experimentId/cohorts/:cohortId', deleteCohort);

// Health check endpoint (also requires authentication)
app.get('/v1/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use(
  (
    err: Error & {status?: number; statusCode?: number},
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = err.status || err.statusCode || 500;
    // Only log unexpected errors (5xx), not client errors (4xx)
    if (status >= 500) {
      console.error('API Error:', err);
    }
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  },
);

/**
 * Main Deliberate Lab REST API endpoint
 * Deployed as /api
 */
export const api = onRequest(
  {
    timeoutSeconds: 60,
    maxInstances: 100,
  },
  app,
);

/**
 * Create Deliberate Lab API key endpoint (uses Firebase Auth)
 * This is a callable function that requires Firebase authentication
 */
export const createDeliberateLabAPIKey = onCall(
  {
    timeoutSeconds: 30,
  },
  async (request) => {
    // Check if user is authenticated
    await AuthGuard.isExperimenter(request);

    const {keyName, permissions} = request.data;

    if (!keyName || typeof keyName !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Key name is required',
      );
    }

    // Use email as experimenterId to match the experimenters collection structure
    const experimenterId = request.auth!.token.email?.toLowerCase();
    if (!experimenterId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User email not found',
      );
    }

    try {
      // Create the API key with optional permissions
      const {apiKey, keyId} =
        await deliberateLabAPIKeyService.createDeliberateLabAPIKey(
          experimenterId,
          keyName,
          permissions || [
            DeliberateLabAPIKeyPermission.READ,
            DeliberateLabAPIKeyPermission.WRITE,
          ],
        );

      return {
        success: true,
        apiKey,
        keyId,
        message: 'Save this API key securely. It will not be shown again.',
      };
    } catch (error) {
      console.error('Error generating API key:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate API key',
      );
    }
  },
);

/**
 * List Deliberate Lab API keys for the authenticated user
 * Returns metadata only (no actual keys)
 */
export const listDeliberateLabAPIKeys = onCall(
  {
    timeoutSeconds: 30,
  },
  async (request) => {
    // Check if user is authenticated
    await AuthGuard.isExperimenter(request);

    // Use email as experimenterId to match the experimenters collection structure
    const experimenterId = request.auth!.token.email?.toLowerCase();
    if (!experimenterId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User email not found',
      );
    }

    try {
      const keys =
        await deliberateLabAPIKeyService.listDeliberateLabAPIKeys(
          experimenterId,
        );

      return {
        success: true,
        keys,
      };
    } catch (error) {
      console.error('Error listing API keys:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to list API keys',
      );
    }
  },
);

/**
 * Revoke a Deliberate Lab API key
 */
export const revokeDeliberateLabAPIKey = onCall(
  {
    timeoutSeconds: 30,
  },
  async (request) => {
    // Check if user is authenticated
    await AuthGuard.isExperimenter(request);

    const {keyId} = request.data;

    if (!keyId || typeof keyId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Key ID is required',
      );
    }

    // Use email as experimenterId to match the experimenters collection structure
    const experimenterId = request.auth!.token.email?.toLowerCase();
    if (!experimenterId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User email not found',
      );
    }

    try {
      const success =
        await deliberateLabAPIKeyService.revokeDeliberateLabAPIKey(
          keyId,
          experimenterId,
        );

      if (!success) {
        throw new functions.https.HttpsError(
          'not-found',
          'API key not found or you do not have permission to revoke it',
        );
      }

      return {
        success: true,
        message: 'API key revoked successfully',
      };
    } catch (error) {
      // Re-throw HttpsErrors (like not-found) as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Error revoking API key:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to revoke API key',
      );
    }
  },
);
