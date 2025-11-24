/**
 * Admin endpoints for administrative tasks.
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {app} from './app';
import {AuthGuard} from './utils/auth-guard';

interface AllowlistEntry {
  isAdmin?: boolean;
}

interface NormalizeAllowlistResult {
  success: boolean;
  normalizedCount: number;
  alreadyLowercaseCount: number;
  conflictCount: number;
  totalProcessed: number;
  details: string[];
}

/**
 * Normalize allowlist emails to lowercase.
 * Only accessible by admins.
 * Creates lowercase versions of allowlist entries without deleting originals.
 */
export const normalizeAllowlistEmails = onCall(async (request) => {
  // Check if user is admin
  await AuthGuard.isAdmin(request);

  const db = app.firestore();
  const allowlistRef = db.collection('allowlist');

  try {
    const snapshot = await allowlistRef.get();

    if (snapshot.empty) {
      return {
        success: true,
        normalizedCount: 0,
        alreadyLowercaseCount: 0,
        conflictCount: 0,
        totalProcessed: 0,
        details: ['No documents found in allowlist collection.'],
      };
    }

    let normalizedCount = 0;
    let alreadyLowercaseCount = 0;
    let conflictCount = 0;
    const details: string[] = [];

    // Process each document
    for (const doc of snapshot.docs) {
      const originalEmail = doc.id;
      const lowercaseEmail = originalEmail.toLowerCase();
      const data = doc.data() as AllowlistEntry;

      if (originalEmail === lowercaseEmail) {
        alreadyLowercaseCount++;
        continue;
      }

      // Check if lowercase version already exists
      const lowercaseDoc = await allowlistRef.doc(lowercaseEmail).get();

      if (lowercaseDoc.exists) {
        conflictCount++;
        details.push(
          `Conflict: ${originalEmail} -> ${lowercaseEmail} (lowercase version already exists)`,
        );
        continue;
      }

      // Create new document with lowercase email
      await allowlistRef.doc(lowercaseEmail).set(data);
      normalizedCount++;
      details.push(`Normalized: ${originalEmail} -> ${lowercaseEmail}`);
    }

    const result: NormalizeAllowlistResult = {
      success: true,
      normalizedCount,
      alreadyLowercaseCount,
      conflictCount,
      totalProcessed: snapshot.size,
      details,
    };

    return result;
  } catch (error) {
    console.error('Error normalizing allowlist emails:', error);
    throw new HttpsError('internal', 'Failed to normalize allowlist emails');
  }
});
