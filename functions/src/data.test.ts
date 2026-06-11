// This test assumes that a Firestore emulator is running, either at the port
// specified by the FIRESTORE_EMULATOR_HOST environment variable, or at 8080 if
// not specified. npm test is configured to set up a temporary emulator to run
// the test. To do it yourself, run e.g.:
//
// firebase emulators:exec --only firestore "npx jest src/data.test.ts"

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  createModelLogEntry,
  ModelResponseStatus,
} from '@deliberation-lab/utils';
import {getExperimentLogs} from './data';

const RULES = `
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /{document=**} {
allow read, write: if true;
}
}
}
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFirestore: any;

describe('getExperimentLogs', () => {
  let testEnv: RulesTestEnvironment;

  const experimentId = 'test-experiment';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'deliberate-lab-data-test',
      firestore: {
        rules: RULES,
        ...(!process.env.FIRESTORE_EMULATOR_HOST && {
          host: 'localhost',
          port: 8081,
        }),
      },
    });
    mockFirestore = testEnv.unauthenticatedContext().firestore();
    mockFirestore.settings({ignoreUndefinedProperties: true, merge: true});
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Seed the experiment document so getExperimentLogs doesn't return null.
    await mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .set({name: 'Test Experiment'});
  });

  /** Helper: write a log entry with a specific createdTimestamp. */
  async function seedLog(id: string, timestampDate: Date) {
    const entry = createModelLogEntry({
      id,
      experimentId,
      response: {status: ModelResponseStatus.NONE},
      // Pass a Date() to work around firebase-functions-test timestamp
      // incompatibility:
      // https://github.com/firebase/firebase-js-sdk/issues/6077
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdTimestamp: timestampDate as any,
    });

    await mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .collection('logs')
      .doc(id)
      .set(entry);
  }

  it('should return null for a nonexistent experiment', async () => {
    const result = await getExperimentLogs(
      mockFirestore,
      'nonexistent-experiment',
    );
    expect(result).toBeNull();
  });

  it('should return all logs when no pagination options are provided', async () => {
    await seedLog('log-1', new Date('2025-01-01T00:00:00Z'));
    await seedLog('log-2', new Date('2025-01-01T00:01:00Z'));
    await seedLog('log-3', new Date('2025-01-01T00:02:00Z'));

    const result = await getExperimentLogs(mockFirestore, experimentId);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result!.map((l) => l.id)).toEqual(['log-1', 'log-2', 'log-3']);
  });

  it('should paginate: 3 logs with limit=2 yields a page of 2 then a page of 1', async () => {
    await seedLog('log-a', new Date('2025-06-01T10:00:00Z'));
    await seedLog('log-b', new Date('2025-06-01T10:01:00Z'));
    await seedLog('log-c', new Date('2025-06-01T10:02:00Z'));

    // --- Page 1: first 2 logs ---
    const page1 = await getExperimentLogs(mockFirestore, experimentId, {
      limit: 2,
    });
    expect(page1).not.toBeNull();
    expect(page1!.length).toBe(2);
    expect(page1!.map((l) => l.id)).toEqual(['log-a', 'log-b']);

    // --- Page 2: use last entry's createdTimestamp as cursor ---
    const cursor = page1![page1!.length - 1].createdTimestamp;
    const page2 = await getExperimentLogs(mockFirestore, experimentId, {
      cursor,
      limit: 2,
    });
    expect(page2).not.toBeNull();
    expect(page2!.length).toBe(1);
    expect(page2![0].id).toBe('log-c');
  });

  it('should return an empty array when cursor is past all logs', async () => {
    await seedLog('log-x', new Date('2025-01-01T00:00:00Z'));

    // Fetch the single log to get its timestamp.
    const page1 = await getExperimentLogs(mockFirestore, experimentId, {
      limit: 10,
    });
    expect(page1).not.toBeNull();
    expect(page1!.length).toBe(1);

    // Page past the end.
    const cursor = page1![0].createdTimestamp;
    const page2 = await getExperimentLogs(mockFirestore, experimentId, {
      cursor,
      limit: 10,
    });
    expect(page2).not.toBeNull();
    expect(page2!.length).toBe(0);
  });

  it('should return an empty array when the experiment has no logs', async () => {
    const result = await getExperimentLogs(mockFirestore, experimentId);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(0);
  });
});
