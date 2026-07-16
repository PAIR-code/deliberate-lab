const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({projectId: 'demo-deliberate-lab'});
const db = admin.firestore();

async function check() {
  const snap = await db.collection('experiments').get();
  console.log('Total experiments in Firestore emulator:', snap.size);
  snap.forEach((doc) => {
    const d = doc.data();
    console.log(
      ` - ID: ${doc.id} | Name: "${d.metadata?.name}" | Creator: "${d.metadata?.creator}" | Visibility: "${d.permissions?.visibility}"`,
    );
  });

  const expSnap = await db.collection('experimenters').get();
  console.log('\nTotal experimenters:', expSnap.size);
  expSnap.forEach((doc) => {
    console.log(` - Experimenter ID: ${doc.id} | Data:`, doc.data());
  });
}

check().catch(console.error);
