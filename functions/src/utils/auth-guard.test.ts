jest.mock('../app', () => ({
  app: {
    firestore: jest.fn(),
  },
}));

import type {CallableRequest} from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';

import {app} from '../app';
import {AuthGuard} from './auth-guard';

const firestoreMock = app.firestore as jest.Mock;

const experimenterEmail = 'experimenter@example.com';
const adminEmail = 'admin@example.com';

type AllowlistEntry = {isAdmin?: boolean};

const createAllowlistData = (): Record<string, AllowlistEntry> => ({
  [experimenterEmail]: {},
  [adminEmail]: {isAdmin: true},
});

const createFirestoreStub = (allowlist: Record<string, AllowlistEntry>) => ({
  collection: (collectionName: string) => {
    if (collectionName !== 'allowlist') {
      throw new Error(`Unexpected collection: ${collectionName}`);
    }
    return {
      doc: (docId: string) => ({
        async get() {
          const entry = allowlist[docId.toLowerCase()];
          return {
            exists: Boolean(entry),
            data: () => entry,
          };
        },
      }),
    };
  },
});

describe('AuthGuard', () => {
  let allowlistData: Record<string, AllowlistEntry>;

  beforeEach(() => {
    jest.clearAllMocks();
    allowlistData = createAllowlistData();
    firestoreMock.mockReturnValue(createFirestoreStub(allowlistData));
  });

  const makeRequest = (email?: string): CallableRequest =>
    ({
      auth: email
        ? {
            uid: 'user-id',
            token: {
              email,
            },
          }
        : undefined,
    }) as unknown as CallableRequest;

  it('allows experimenter emails present in allowlist', async () => {
    await expect(
      AuthGuard.isExperimenter(makeRequest(experimenterEmail)),
    ).resolves.toBeUndefined();
  });

  it('matches experimenter emails in a case-insensitive manner', async () => {
    await expect(
      AuthGuard.isExperimenter(makeRequest(experimenterEmail.toUpperCase())),
    ).resolves.toBeUndefined();
  });

  it('rejects when experimenter email is not allowlisted', async () => {
    delete allowlistData[experimenterEmail];

    await expect(
      AuthGuard.isExperimenter(makeRequest(experimenterEmail)),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects experimenter requests without authentication context', async () => {
    await expect(AuthGuard.isExperimenter(makeRequest())).rejects.toMatchObject(
      {
        code: 'unauthenticated',
      },
    );
  });

  it('rejects experimenter requests without email claims', async () => {
    const request = {
      auth: {
        uid: 'user-id',
        token: {},
      },
    } as unknown as CallableRequest;

    await expect(AuthGuard.isExperimenter(request)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('allows admin emails with isAdmin flag', async () => {
    await expect(
      AuthGuard.isAdmin(makeRequest(adminEmail)),
    ).resolves.toBeUndefined();
  });

  it('rejects admin emails without isAdmin flag', async () => {
    allowlistData[adminEmail] = {};

    await expect(
      AuthGuard.isAdmin(makeRequest(adminEmail)),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects admin requests without allowlist entry', async () => {
    delete allowlistData[adminEmail];

    await expect(
      AuthGuard.isAdmin(makeRequest(adminEmail)),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects admin requests without auth context', async () => {
    await expect(AuthGuard.isAdmin(makeRequest())).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rejects admin requests without email claim', async () => {
    const request = {
      auth: {
        uid: 'user-id',
        token: {},
      },
    } as unknown as CallableRequest;

    await expect(AuthGuard.isAdmin(request)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('throws HttpsError instances on rejection', async () => {
    delete allowlistData[adminEmail];

    await expect(
      AuthGuard.isAdmin(makeRequest(adminEmail)),
    ).rejects.toBeInstanceOf(functions.https.HttpsError);
  });
});
