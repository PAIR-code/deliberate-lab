/**
 * Script to normalize allowlist emails to lowercase.
 *
 * This script reads all documents in the allowlist collection and creates
 * new documents with lowercase email IDs, copying over all the data.
 * Original documents with mixed-case emails are NOT deleted automatically
 * for safety - they should be manually reviewed and deleted after verification.
 *
 * Usage:
 *   npx tsx src/scripts/normalize-allowlist-emails.ts
 *
 * Or compile and run:
 *   npm run build
 *   node lib/scripts/normalize-allowlist-emails.js
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const app = admin.initializeApp();
const db = app.firestore();

interface AllowlistEntry {
  isAdmin?: boolean;
}

async function normalizeAllowlistEmails() {
  console.log('🔄 Starting allowlist email normalization...\n');

  try {
    // Get all documents from the allowlist collection
    const allowlistRef = db.collection('allowlist');
    const snapshot = await allowlistRef.get();

    if (snapshot.empty) {
      console.log('❌ No documents found in allowlist collection.');
      return;
    }

    console.log(
      `📋 Found ${snapshot.size} document(s) in allowlist collection.\n`,
    );

    let normalizedCount = 0;
    let alreadyLowercaseCount = 0;
    let errorCount = 0;

    // Process each document
    for (const doc of snapshot.docs) {
      const originalEmail = doc.id;
      const lowercaseEmail = originalEmail.toLowerCase();
      const data = doc.data() as AllowlistEntry;

      console.log(`Processing: ${originalEmail}`);

      if (originalEmail === lowercaseEmail) {
        console.log(`  ✅ Already lowercase, skipping.\n`);
        alreadyLowercaseCount++;
        continue;
      }

      try {
        // Check if lowercase version already exists
        const lowercaseDoc = await allowlistRef.doc(lowercaseEmail).get();

        if (lowercaseDoc.exists) {
          console.log(
            `  ⚠️  Lowercase version already exists: ${lowercaseEmail}`,
          );
          console.log(
            `     Original document NOT modified. Manual review recommended.\n`,
          );
          errorCount++;
          continue;
        }

        // Create new document with lowercase email
        await allowlistRef.doc(lowercaseEmail).set(data);
        console.log(`  ✅ Created lowercase version: ${lowercaseEmail}`);
        console.log(`  ⚠️  Original document still exists: ${originalEmail}`);
        console.log(`     Manual deletion recommended after verification.\n`);

        normalizedCount++;
      } catch (error) {
        console.error(`  ❌ Error processing ${originalEmail}:`, error);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total documents processed: ${snapshot.size}`);
    console.log(`Already lowercase: ${alreadyLowercaseCount}`);
    console.log(`Normalized: ${normalizedCount}`);
    console.log(`Errors/Conflicts: ${errorCount}`);
    console.log('='.repeat(60));

    if (normalizedCount > 0) {
      console.log(
        '\n⚠️  IMPORTANT: Original mixed-case documents still exist!',
      );
      console.log(
        'Please review the new lowercase documents and manually delete',
      );
      console.log('the original mixed-case ones after verification.');
    }

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }

  // Exit cleanly
  process.exit(0);
}

// Run the script
normalizeAllowlistEmails();
