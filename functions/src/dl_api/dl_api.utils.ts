/**
 * Shared utilities for Deliberate Lab REST API endpoints
 * Includes authentication middleware and validation helpers
 */

import {Request, Response, NextFunction} from 'express';
import {
  verifyDeliberateLabAPIKey,
  extractDeliberateLabBearerToken,
} from './dl_api_key.utils';

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
  if (data === undefined) return true;

  const validationError = validator(data);
  if (validationError) {
    res.status(400).json({error: validationError});
    return false;
  }
  return true;
}
