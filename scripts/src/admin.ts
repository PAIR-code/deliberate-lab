/** Connect to a running Firebase app and expose it to scripts:
 *
 * - Default: connects to local emulators
 * - `NODE_ENV=production` will connect to the production Firebase project specified in `service-account.json`
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import credentials from "../service-account.json";

const loadConfig = (fileName: string): any => {
  try {
    const rawData = fs.readFileSync(fileName, { encoding: "utf-8" });
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error reading or parsing ${fileName}:`, error);
    throw error;
  }
};

export const initializeApp = () => {
  const firebaserc = loadConfig("../.firebaserc");

  if (process.env.NODE_ENV === "production") {
    admin.initializeApp({
      credential: admin.credential.cert(credentials as admin.ServiceAccount),
    });
  } else {
    // Default to local emulators
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    admin.initializeApp({
      projectId: firebaserc.projects.default,
    });
  }
  console.log("Successfully connected to Firebase!");
};

export default admin;
