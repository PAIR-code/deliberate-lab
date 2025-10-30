/**
 * Main REST API endpoint for Deliberate Lab (Express version)
 * Server-to-server API with API key authentication
 */

import {onRequest, onCall} from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import express from 'express';
import rateLimit, {ipKeyGenerator} from 'express-rate-limit';
import {authenticateAPIKey, rejectBrowserRequests} from './api.utils';
import {AuthGuard} from '../utils/auth-guard';
import {APIKeyPermission} from '@deliberation-lab/utils';
import * as apiKeyService from './api_key.utils';
import {
  listExperiments,
  createExperiment,
  getExperiment,
  updateExperiment,
  deleteExperiment,
  exportExperimentData,
} from './experiments.api';

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
    const apiKey = apiKeyService.extractBearerToken(req.headers.authorization);
    // Use API key if found, otherwise fall back to properly normalized IP
    return apiKey || ipKeyGenerator(req.ip || 'unknown');
  },
});

// Apply middleware in order:
// 1. Rate limiting
app.use(limiter);

// 2. Reject browser requests (server-to-server only)
app.use(rejectBrowserRequests);

// 3. Authenticate API key
app.use(authenticateAPIKey);

// API Routes
app.get('/v1/experiments', listExperiments);
app.post('/v1/experiments', createExperiment);
app.get('/v1/experiments/:id', getExperiment);
app.put('/v1/experiments/:id', updateExperiment);
app.delete('/v1/experiments/:id', deleteExperiment);
app.get('/v1/experiments/:id/export', exportExperimentData);

// Health check endpoint (doesn't require auth)
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
    err: Error & {status?: number},
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  },
);

/**
 * Main REST API endpoint
 * Deploy as a Firebase Function
 */
export const api = onRequest(
  {
    timeoutSeconds: 60,
    maxInstances: 100,
  },
  app,
);

/**
 * Create API key endpoint (uses Firebase Auth)
 * This is a callable function that requires Firebase authentication
 */
export const createAPIKey = onCall(
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

    const experimenterId = request.auth!.uid;

    try {
      // Create the API key with optional permissions
      const {apiKey, keyId} = await apiKeyService.createAPIKey(
        experimenterId,
        keyName,
        permissions || [APIKeyPermission.READ, APIKeyPermission.WRITE],
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
 * List API keys for the authenticated user
 * Returns metadata only (no actual keys)
 */
export const listAPIKeys = onCall(
  {
    timeoutSeconds: 30,
  },
  async (request) => {
    // Check if user is authenticated
    await AuthGuard.isExperimenter(request);

    const experimenterId = request.auth!.uid;

    try {
      const keys = await apiKeyService.listAPIKeys(experimenterId);

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
 * Revoke an API key
 */
export const revokeAPIKey = onCall(
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

    const experimenterId = request.auth!.uid;

    try {
      const success = await apiKeyService.revokeAPIKey(keyId, experimenterId);

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
      console.error('Error revoking API key:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to revoke API key',
      );
    }
  },
);
