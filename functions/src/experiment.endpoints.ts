import {Value} from '@sinclair/typebox/value';
import {
  AgentMediatorPersonaConfig,
  AgentMediatorTemplate,
  AgentParticipantPersonaConfig,
  AgentParticipantTemplate,
  Experiment,
  ExperimentDeletionData,
  ExperimentDownloadResponse,
  MediatorPromptConfig,
  ParticipantPromptConfig,
  SeedStrategy,
  StageConfig,
  createExperimentConfig,
  createExperimentTemplate,
  createVariableToValueMapForSeed,
} from '@deliberation-lab/utils';
import {getExperimentDownload} from './data';

import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';

const EXPERIMENTS_COLLECTION = 'experiments';

/** Create, update, and delete experiments and experiment templates. */

// ************************************************************************* //
// writeExperiment endpoint                                                  //
// (create new experiment to specified Firestore collection)                 //
//                                                                           //
// Input structure: { collectionName, experimentTemplate }                   //
// Validation: utils/src/experiment.validation.ts                            //
// ************************************************************************* //
export const writeExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;
  const template = data.experimentTemplate;

  // Set up experiment config with stageIds
  const experimentConfig = createExperimentConfig(
    template.stageConfigs,
    template.experiment,
  );

  // Define document reference
  const document = app
    .firestore()
    .collection(EXPERIMENTS_COLLECTION)
    .doc(experimentConfig.id);

  // If experiment exists, do not allow creation.
  if ((await document.get()).exists) {
    return {id: ''};
  }

  // Use current experimenter as creator
  if (request.auth) {
    experimentConfig.metadata.creator = request.auth.token.email || '';
    experimentConfig.metadata.creator =
      experimentConfig.metadata.creator.toLowerCase();
  }

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, experimentConfig);

    // Add collection of stages
    for (const stage of template.stageConfigs) {
      transaction.set(document.collection('stages').doc(stage.id), stage);
    }

    // Add variable values at the experiment level
    experimentConfig.variableMap = createVariableToValueMapForSeed(
      experimentConfig.variableConfigs ?? [],
      SeedStrategy.EXPERIMENT,
    );

    // Add agent mediators under `agentMediators` collection
    template.agentMediators.forEach((agent) => {
      const doc = document.collection('agentMediators').doc(agent.persona.id);
      transaction.set(doc, agent.persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    });

    // Add agent participants under `agentParticipants` collection
    // NOTE: We don't currently allow agent participant persona setup
    // in the experiment editor, so the list of agentParticipants
    // is expected to be length 0.
    template.agentParticipants.forEach((agent) => {
      const doc = document
        .collection('agentParticipants')
        .doc(agent.persona.id);
      transaction.set(doc, agent.persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    });
  });

  return {id: document.id};
});

// ************************************************************************* //
// updateExperiment endpoint                                                 //
// (Update existing experiment to specified Firestore collection)            //
//                                                                           //
// Input structure: { collectionName, experimentTemplate }                   //
// Validation: utils/src/experiment.validation.ts                            //
// ************************************************************************* //
export const updateExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;
  const template = data.experimentTemplate;

  // Set up experiment config with stageIds
  const experimentConfig = createExperimentConfig(
    template.stageConfigs,
    template.experiment,
  );

  // Define document reference
  const document = app
    .firestore()
    .collection(EXPERIMENTS_COLLECTION)
    .doc(experimentConfig.id);

  // If experiment does not exist, return false
  const oldExperiment = await document.get();
  if (!oldExperiment.exists) {
    return {success: false};
  }
  // Verify that the experimenter is the creator
  // TODO: Enable admins to update experiment?
  if (
    request.auth?.token.email?.toLowerCase() !==
    oldExperiment.data()?.metadata.creator
  ) {
    return {success: false};
  }

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, experimentConfig);

    // Clean up obsolete docs in stages, agents collections.
    const oldStageCollection = document.collection('stages');
    const oldAgentCollection = document.collection('agents');
    await app.firestore().recursiveDelete(oldStageCollection);
    await app.firestore().recursiveDelete(oldAgentCollection);

    // Add updated collection of stages
    for (const stage of template.stageConfigs) {
      transaction.set(document.collection('stages').doc(stage.id), stage);
    }

    // Add agent mediators under `agentMediators` collection
    template.agentMediators.forEach((agent) => {
      const doc = document.collection('agentMediators').doc(agent.persona.id);
      transaction.set(doc, agent.persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    });

    // Add agent participants under `agentParticipants` collection
    template.agentParticipants.forEach((agent) => {
      const doc = document
        .collection('agentParticipants')
        .doc(agent.persona.id);
      transaction.set(doc, agent.persona);
      for (const prompt of Object.values(agent.promptMap)) {
        transaction.set(doc.collection('prompts').doc(prompt.id), prompt);
      }
    });
  });

  return {success: true};
});

// ************************************************************************* //
// deleteExperiment endpoint                                                 //
// (recursively remove experiment doc and subcollections)                    //
//                                                                           //
// Input structure: { collectionName, experimentId }                         //
// Validation: utils/src/experiment.validation.ts                            //
// ************************************************************************* //
export const deleteExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  // Validate input
  const validInput = Value.Check(ExperimentDeletionData, data);
  if (!validInput) {
    throw new HttpsError('invalid-argument', 'Invalid data');
  }

  // Verify that experimenter is the creator before enabling delete
  // TODO: Enable admins to delete?
  const experiment = (
    await app
      .firestore()
      .collection(data.collectionName)
      .doc(data.experimentId)
      .get()
  ).data();
  if (!experiment) {
    throw new HttpsError(
      'not-found',
      `Experiment ${data.experimentId} not found in collection ${EXPERIMENTS_COLLECTION}`,
    );
  }
  if (request.auth?.token.email?.toLowerCase() !== experiment.metadata.creator)
    return {success: false};

  // Delete document
  const doc = app
    .firestore()
    .doc(`${EXPERIMENTS_COLLECTION}/${data.experimentId}`);
  app.firestore().recursiveDelete(doc);
  return {success: true};
});

// ************************************************************************* //
// getExperimentTemplate endpoint                                            //
//                                                                           //
// Input structure: { collectionName, experimentId }                         //
// Validation: utils/src/experiment.validation.ts                            //
// ************************************************************************* //
export const getExperimentTemplate = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  const experiment = (
    await app
      .firestore()
      .collection(EXPERIMENTS_COLLECTION)
      .doc(data.experimentId)
      .get()
  ).data();

  if (!experiment) {
    throw new HttpsError(
      'not-found',
      `Experiment ${data.experimentId} not found in collection ${EXPERIMENTS_COLLECTION}`,
    );
  }

  const template = createExperimentTemplate({
    id: '',
    experiment,
  });

  // Add stage configs
  const stageConfigs = (
    await app
      .firestore()
      .collection(EXPERIMENTS_COLLECTION)
      .doc(data.experimentId)
      .collection('stages')
      .get()
  ).docs.map((doc) => doc.data() as StageConfig);

  // Order stage configs correctly
  for (const stageId of experiment.stageIds) {
    const stage = stageConfigs.find((stage) => stage.id === stageId);
    if (stage) {
      template.stageConfigs.push(stage);
    }
  }

  // For each agent mediator, add template
  const agentMediatorCollection = app
    .firestore()
    .collection(EXPERIMENTS_COLLECTION)
    .doc(data.experimentId)
    .collection('agentMediators');

  const mediatorAgents = (await agentMediatorCollection.get()).docs.map(
    (agent) => agent.data() as AgentMediatorPersonaConfig,
  );
  for (const persona of mediatorAgents) {
    const mediatorPrompts = (
      await app
        .firestore()
        .collection(EXPERIMENTS_COLLECTION)
        .doc(data.experimentId)
        .collection('agentMediators')
        .doc(persona.id)
        .collection('prompts')
        .get()
    ).docs.map((doc) => doc.data() as MediatorPromptConfig);
    const mediatorTemplate: AgentMediatorTemplate = {
      persona,
      promptMap: {},
    };
    mediatorPrompts.forEach((prompt) => {
      mediatorTemplate.promptMap[prompt.id] = prompt;
    });
    template.agentMediators.push(mediatorTemplate);
  }

  // For each agent participant, add template
  const agentParticipantCollection = app
    .firestore()
    .collection(EXPERIMENTS_COLLECTION)
    .doc(data.experimentId)
    .collection('agentParticipants');
  const participantAgents = (await agentParticipantCollection.get()).docs.map(
    (agent) => agent.data() as AgentParticipantPersonaConfig,
  );
  for (const persona of participantAgents) {
    const participantPrompts = (
      await app
        .firestore()
        .collection(EXPERIMENTS_COLLECTION)
        .doc(data.experimentId)
        .collection('agentParticipants')
        .doc(persona.id)
        .collection('prompts')
        .get()
    ).docs.map((doc) => doc.data() as ParticipantPromptConfig);
    const participantTemplate: AgentParticipantTemplate = {
      persona,
      promptMap: {},
    };
    participantPrompts.forEach((prompt) => {
      participantTemplate.promptMap[prompt.id] = prompt;
    });
    template.agentParticipants.push(participantTemplate);
  }

  return template;
});

// ************************************************************************* //
// setExperimentCohortLock for experimenters                                 //
//                                                                           //
// Input structure: { experimentId, cohortId, isLock }                       //
// Validation: utils/src/experiment.validation.ts                            //
// ************************************************************************* //
// TODO: Move isLock under CohortConfig instead of Experiment config?
export const setExperimentCohortLock = onCall(async (request) => {
  // TODO: Only allow creator, admins, and readers to set lock
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  // Define document reference
  const document = app
    .firestore()
    .collection(EXPERIMENTS_COLLECTION)
    .doc(data.experimentId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const experiment = (await document.get()).data() as Experiment;
    experiment.cohortLockMap[data.cohortId] = data.isLock;
    transaction.set(document, experiment);
  });

  return {success: true};
});

// ************************************************************************* //
// downloadExperiment for experimenters                                      //
//                                                                           //
// Input structure: { experimentId }                                         //
// Returns: ExperimentDownloadResponse                                       //
// ************************************************************************* //
export const downloadExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  try {
    const experimentDownload = await getExperimentDownload(
      app.firestore(),
      data.experimentId,
    );

    const response: ExperimentDownloadResponse = {
      data: experimentDownload,
    };

    return response;
  } catch (error) {
    console.error('Error downloading experiment:', error);
    return {data: null};
  }
});
