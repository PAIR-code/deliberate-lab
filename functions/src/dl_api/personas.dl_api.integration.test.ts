/**
 * Integration tests for persona bank API endpoints
 *
 * This test requires a Firestore emulator running. Run via:
 * npm run test:firestore
 */

import {
  TestContext,
  setupTestContext,
  teardownTestContext,
  cleanupExperiment,
  createApiRequestHelper,
  createExperimentViaApi,
} from './dl_api.test.utils';

let ctx: TestContext;
let apiRequest: ReturnType<typeof createApiRequestHelper>;

describe('Persona Bank API Integration Tests', () => {
  const createdExperimentIds: string[] = [];

  beforeAll(async () => {
    ctx = await setupTestContext('Persona Bank Tests');
    apiRequest = createApiRequestHelper(ctx.baseUrl, ctx.apiKey);
  });

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  beforeEach(async () => {
    for (const expId of createdExperimentIds) {
      await cleanupExperiment(ctx.testEnv, expId);
    }
    createdExperimentIds.length = 0;
  });

  async function createTestExperiment(name: string): Promise<string> {
    const experimentId = await createExperimentViaApi(apiRequest, name);
    createdExperimentIds.push(experimentId);
    return experimentId;
  }

  it('uploads and lists the agent persona bank by default', async () => {
    const experimentId = await createTestExperiment('Personas Upload');

    const upload = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {
        personas: [
          {id: 'p1', hash: 'h1', content: 'Persona one'},
          {id: 'p2', hash: 'h1', content: 'Persona two', usageCount: 3},
        ],
      },
    );
    expect(upload.status).toBe(201);
    const uploadBody = await upload.json();
    expect(uploadBody.collection).toBe('personas');
    expect(uploadBody.written).toBe(2);
    expect(uploadBody.removed).toBe(0);

    const list = await apiRequest(
      'GET',
      `/v1/experiments/${experimentId}/personas`,
    );
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.total).toBe(2);
    const p1 = listBody.personas.find((p: {id: string}) => p.id === 'p1');
    expect(p1.content).toBe('Persona one');
    expect(p1.usageCount).toBe(0);
    expect(p1.usedBy).toEqual([]);
  });

  it('uploads to the representative bank and replaces on request', async () => {
    const experimentId = await createTestExperiment('Rep Personas Upload');

    const first = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {
        collection: 'repPersonas',
        personas: [{id: 'r1', content: 'Rep one'}],
      },
    );
    expect(first.status).toBe(201);

    const second = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {
        collection: 'repPersonas',
        replace: true,
        personas: [
          {id: 'r2', content: 'Rep two'},
          {id: 'r3', content: 'Rep three'},
        ],
      },
    );
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.written).toBe(2);
    expect(secondBody.removed).toBe(1);

    const list = await apiRequest(
      'GET',
      `/v1/experiments/${experimentId}/personas?collection=repPersonas`,
    );
    const listBody = await list.json();
    expect(listBody.collection).toBe('repPersonas');
    expect(listBody.personas.map((p: {id: string}) => p.id).sort()).toEqual([
      'r2',
      'r3',
    ]);

    // The agent bank is untouched by repPersonas writes.
    const agentBank = await apiRequest(
      'GET',
      `/v1/experiments/${experimentId}/personas`,
    );
    expect((await agentBank.json()).total).toBe(0);
  });

  it('rejects bad requests', async () => {
    const experimentId = await createTestExperiment('Personas Validation');

    const empty = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {personas: []},
    );
    expect(empty.status).toBe(400);

    const badCollection = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {collection: 'participants', personas: [{id: 'x'}]},
    );
    expect(badCollection.status).toBe(400);

    const duplicateIds = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {personas: [{id: 'dup'}, {id: 'dup'}]},
    );
    expect(duplicateIds.status).toBe(400);

    const badField = await apiRequest(
      'POST',
      `/v1/experiments/${experimentId}/personas`,
      {personas: [{id: 'y', usageCount: 'three'}]},
    );
    expect(badField.status).toBe(400);
  });
});
