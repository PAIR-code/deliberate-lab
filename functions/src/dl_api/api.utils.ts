/**
 * Shared utilities for REST API endpoints
 * Includes authentication middleware and validation helpers
 */

import {Request, Response, NextFunction} from 'express';
import {verifyAPIKey, extractBearerToken} from './api_key.utils';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface AuthenticatedRequest extends Request {
  apiKeyData?: {
    experimenterId: string;
    permissions: string[];
    name: string;
  };
}

// ************************************************************************* //
// AUTHENTICATION MIDDLEWARE                                                 //
// ************************************************************************* //

/**
 * Middleware to reject browser requests (server-to-server only)
 */
export function rejectBrowserRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    res.status(403).json({
      error:
        'Browser access not allowed. Use API keys from server-side applications only.',
    });
    return;
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
 * Express middleware to authenticate API key
 * Simplified async version using Express patterns
 */
export const authenticateAPIKey = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Extract and validate Bearer token
    const apiKey = extractBearerToken(req.headers.authorization);

    if (!apiKey) {
      const error = req.headers.authorization
        ? 'Invalid Authorization header format. Use: Authorization: Bearer YOUR_API_KEY'
        : 'Missing Authorization header. Use: Authorization: Bearer YOUR_API_KEY';

      return res.status(401).json({error});
    }

    try {
      // Verify API key
      const {valid, data} = await verifyAPIKey(apiKey);

      if (!valid || !data) {
        return res.status(401).json({error: 'Invalid or expired API key'});
      }

      // Attach API key data to request
      req.apiKeyData = {
        experimenterId: data.experimenterId,
        permissions: data.permissions,
        name: data.name,
      };

      next();
    } catch (error) {
      console.error('Error verifying API key:', error);
      return res
        .status(500)
        .json({error: 'Internal server error during authentication'});
    }
  },
);

/**
 * Check if the API key has a specific permission
 */
export function hasPermission(
  req: AuthenticatedRequest,
  permission: string,
): boolean {
  return req.apiKeyData?.permissions?.includes(permission) ?? false;
}

/**
 * Express middleware to check for a specific permission
 */
export function requirePermission(permission: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!hasPermission(req, permission)) {
      res.status(403).json({
        error: `Insufficient permissions. Required: ${permission}`,
      });
      return;
    }
    next();
  };
}

// ************************************************************************* //
// VALIDATION HELPERS                                                        //
// ************************************************************************* //

/**
 * Generic validation helper that validates data and sends error response if invalid
 *
 * This helper simplifies validation in Express endpoints by handling both validation
 * and error response in a single call.
 *
 * @param data - Data to validate (can be undefined)
 * @param validator - Validation function that returns error message string or null if valid
 * @param res - Express response object
 * @returns true if data is valid or undefined, false if validation failed (response already sent)
 *
 * @example
 * ```typescript
 * // In an Express endpoint
 * if (!validateOrRespond(body.stages, validateStages, res)) return;
 *
 * // With custom validator
 * const validateEmail = (email: string) => {
 *   return email.includes('@') ? null : 'Invalid email format';
 * };
 * if (!validateOrRespond(body.email, validateEmail, res)) return;
 * ```
 */
export function validateOrRespond<T>(
  data: T | undefined,
  validator: (data: T) => string | null,
  res: Response,
): boolean {
  if (!data) return true;

  const validationError = validator(data);
  if (validationError) {
    res.status(400).json({error: validationError});
    return false;
  }
  return true;
}
