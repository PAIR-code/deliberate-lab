const admin = require('firebase-admin');
const fs = require('fs');

// Connect directly to local Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({projectId: 'demo-deliberate-lab'});
const db = admin.firestore();

async function importExperiment() {
  const filePath =
    process.argv[2] ||
    '/Users/ziyiliu/Downloads/Copy of Pilot study GUIDE (v2)_data/Copy of Pilot study GUIDE (v2).json';
  console.log(`Reading JSON from: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const exp = data.experiment;
  if (!exp) {
    console.error('Error: missing "experiment" field in JSON');
    process.exit(1);
  }

  // Ensure experiment belongs to the local test experimenter (experimenter@google.com)
  exp.metadata = exp.metadata || {};
  exp.metadata.creator = 'experimenter@google.com';
  exp.permissions = {visibility: 'public', readers: []};
  console.log(`Writing experiment "${exp.metadata?.name}" (ID: ${exp.id}) to Firestore emulator...`);
  await db.collection('experiments').doc(exp.id).set(exp);

  // Write stage configs
  const stageMap = data.stageMap || {};
  let stageCount = 0;
  for (const sid of exp.stageIds || []) {
    if (stageMap[sid]) {
      await db
        .collection('experiments')
        .doc(exp.id)
        .collection('stages')
        .doc(sid)
        .set(stageMap[sid]);
      stageCount++;
    }
  }

  console.log(
    `✅ Successfully imported experiment "${exp.metadata?.name}" (ID: ${exp.id}) with ${stageCount} stages into local Firestore!`,
  );
  console.log(
    `You can now see and open it right on http://localhost:4201 under 'My experiments' (or all experiments)!`,
  );
  process.exit(0);
}

importExperiment().catch((err) => {
  console.error(err);
  process.exit(1);
});
