/* eslint-disable @typescript-eslint/no-explicit-any */
import firebaseFunctionsTest from 'firebase-functions-test';
import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  AlertMessage,
  AlertStatus,
  createAlertMessage,
  generateId,
} from '@deliberation-lab/utils';
import {
  sendAlertMessage,
  ackAlertMessage,
  sendExperimenterAlert,
  ackExperimenterAlert,
} from './alert.endpoints';
import {Timestamp} from 'firebase-admin/firestore';
import {app} from './app';

const testEnv = firebaseFunctionsTest({projectId: 'demo-deliberate-lab'});
const firestore = app.firestore();

describe('Alert Endpoints Unit Tests', () => {
  let rulesEnv: RulesTestEnvironment;
  const experimentId = 'test-exp-id';
  const cohortId = 'test-cohort-id';
  const stageId = 'test-stage-id';
  const participantId = 'test-participant-id';
  const experimenterEmail = 'experimenter@test.com';
  const unauthorizedEmail = 'unauthorized@test.com';

  beforeAll(async () => {
    rulesEnv = await initializeTestEnvironment({
      projectId: 'demo-deliberate-lab',
      firestore: process.env.FIRESTORE_EMULATOR_HOST
        ? undefined
        : {
            host: 'localhost',
            port: 8081,
          },
    });
  });

  beforeEach(async () => {
    await rulesEnv.clearFirestore();

    // Seed the allowlist for the experimenter user
    await firestore
      .collection('allowlist')
      .doc(experimenterEmail)
      .set({email: experimenterEmail, isAdmin: false});
  });

  afterAll(async () => {
    await rulesEnv.cleanup();
  });

  describe('sendAlertMessage', () => {
    const wrapped = testEnv.wrap(sendAlertMessage);

    it('should allow writing participant-initiated alerts without experimenter auth', async () => {
      const messageText = 'Need assistance!';
      const result = await wrapped({
        auth: {
          uid: 'part-uid',
          token: {email: 'participant@test.com'},
        } as any,
        data: {
          experimentId,
          cohortId,
          stageId,
          participantId,
          message: messageText,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify alert exists in participant alerts collection
      const participantAlerts = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('alerts')
        .get();

      expect(participantAlerts.size).toBe(1);
      const alertDoc = participantAlerts.docs[0].data() as AlertMessage;
      expect(alertDoc.message).toBe(messageText);
      expect(alertDoc.isExperimenterInitiated).toBe(false);
      expect(alertDoc.status).toBe(AlertStatus.NEW);

      // Verify alert exists in global experiment alerts collection
      const globalAlerts = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .doc(alertDoc.id)
        .get();

      expect(globalAlerts.exists).toBe(true);
      expect((globalAlerts.data() as AlertMessage).message).toBe(messageText);
    });
  });

  describe('ackAlertMessage', () => {
    const wrapped = testEnv.wrap(ackAlertMessage);
    let alertId: string;

    beforeEach(async () => {
      alertId = generateId();
      const alert = createAlertMessage({
        id: alertId,
        experimentId,
        cohortId,
        stageId,
        participantId,
        message: 'Help!',
        isExperimenterInitiated: false,
        timestamp: Timestamp.now() as any,
      });

      // Seed alert in both places
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('alerts')
        .doc(alertId)
        .set(alert);

      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .doc(alertId)
        .set(alert);
    });

    it('should reject non-experimenters', async () => {
      await expect(
        wrapped({
          auth: {
            uid: 'bad-uid',
            token: {email: unauthorizedEmail},
          } as any,
          data: {
            experimentId,
            alertId,
            participantId,
            response: 'On my way!',
          },
        } as any),
      ).rejects.toThrow();
    });

    it('should allow experimenter to acknowledge and append response', async () => {
      const responseText = 'On my way!';
      const result = await wrapped({
        auth: {
          uid: 'exp-uid',
          token: {email: experimenterEmail},
        } as any,
        data: {
          experimentId,
          alertId,
          participantId,
          response: responseText,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify alert is marked as READ in participant's alerts collection
      const partAlertDoc = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('alerts')
        .doc(alertId)
        .get();

      const partAlert = partAlertDoc.data() as AlertMessage;
      expect(partAlert.status).toBe(AlertStatus.READ);
      expect(partAlert.responses).toContain(responseText);

      // Verify alert is marked as READ in global experiment alerts collection
      const globAlertDoc = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .doc(alertId)
        .get();

      const globAlert = globAlertDoc.data() as AlertMessage;
      expect(globAlert.status).toBe(AlertStatus.READ);
      expect(globAlert.responses).toContain(responseText);
    });
  });

  describe('sendExperimenterAlert', () => {
    const wrapped = testEnv.wrap(sendExperimenterAlert);

    it('should reject non-experimenters', async () => {
      await expect(
        wrapped({
          auth: {
            uid: 'bad-uid',
            token: {email: unauthorizedEmail},
          } as any,
          data: {
            experimentId,
            cohortId,
            stageId,
            participantId,
            message: 'Attention!',
          },
        } as any),
      ).rejects.toThrow();
    });

    it('should allow experimenter to send proactive alerts to participant', async () => {
      const messageText = 'Attention participant!';
      const result = await wrapped({
        auth: {
          uid: 'exp-uid',
          token: {email: experimenterEmail},
        } as any,
        data: {
          experimentId,
          cohortId,
          stageId,
          participantId,
          message: messageText,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify alert exists in participant alerts collection
      const participantAlerts = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('alerts')
        .get();

      expect(participantAlerts.size).toBe(1);
      const alertDoc = participantAlerts.docs[0].data() as AlertMessage;
      expect(alertDoc.message).toBe(messageText);
      expect(alertDoc.isExperimenterInitiated).toBe(true);
      expect(alertDoc.status).toBe(AlertStatus.NEW);

      // Verify alert exists in global experiment alerts collection
      const globalAlerts = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .doc(alertDoc.id)
        .get();

      expect(globalAlerts.exists).toBe(true);
      expect((globalAlerts.data() as AlertMessage).message).toBe(messageText);
    });
  });

  describe('ackExperimenterAlert', () => {
    const wrapped = testEnv.wrap(ackExperimenterAlert);
    let alertId: string;

    beforeEach(async () => {
      alertId = generateId();
      const alert = createAlertMessage({
        id: alertId,
        experimentId,
        cohortId,
        stageId,
        participantId,
        message: 'Experimenter message!',
        isExperimenterInitiated: true,
        status: AlertStatus.NEW,
        timestamp: Timestamp.now() as any,
      });

      // Seed alert in both places
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('alerts')
        .doc(alertId)
        .set(alert);

      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .doc(alertId)
        .set(alert);
    });

    it('should allow participant to acknowledge experimenter-initiated alert', async () => {
      const result = await wrapped({
        auth: {
          uid: 'part-uid',
          token: {email: 'participant@test.com'},
        } as any,
        data: {
          experimentId,
          alertId,
          participantId,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify alert is marked as READ in participant's alerts collection
      const partAlertDoc = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('alerts')
        .doc(alertId)
        .get();

      const partAlert = partAlertDoc.data() as AlertMessage;
      expect(partAlert.status).toBe(AlertStatus.READ);

      // Verify alert is marked as READ in global experiment alerts collection
      const globAlertDoc = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .doc(alertId)
        .get();

      const globAlert = globAlertDoc.data() as AlertMessage;
      expect(globAlert.status).toBe(AlertStatus.READ);
    });
  });
});
