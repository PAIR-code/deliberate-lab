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
  StageConfig,
  createExperimentTemplate,
} from '@deliberation-lab/utils';
import {getExperimentDownload} from './data';
import {
  deleteExperimentById,
  forkExperimentById,
  updateExperimentFromTemplate,
  writeExperimentFromTemplate,
} from './experiment.utils';

import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';

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

  // Get creator from authenticated user
  const creatorId = request.auth?.token.email?.toLowerCase() || '';

  // Use shared utility to write experiment
  const experimentId = await writeExperimentFromTemplate(
    app.firestore(),
    template,
    creatorId,
    {collectionName: data.collectionName},
  );

  return {id: experimentId};
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

  // Validate input
  const templateId =
    data.experimentTemplate?.id || data.experimentTemplate?.experiment?.id;

  if (!data.collectionName || !templateId) {
    throw new HttpsError(
      'invalid-argument',
      'collectionName and experimentTemplate.id (or experiment.id) are required',
    );
  }

  const experimenterId = request.auth?.token.email?.toLowerCase() || '';

  // Use shared utility to update experiment
  // TODO: Enable admins to update experiment?

  // Define document reference
  const document = app
    .firestore()
    .collection(data.collectionName)
    .doc(templateId);

  // If experiment does not exist, return false
  const oldExperiment = await document.get();
  if (!oldExperiment.exists) {
    return {success: false};
  }

  // Use shared utility to update experiment
  const result = await updateExperimentFromTemplate(
    app.firestore(),
    data.experimentTemplate,
    experimenterId,
    {collectionName: data.collectionName},
  );

  return {success: result.success};
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

  const experimenterId = request.auth?.token.email?.toLowerCase() || '';

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
      `Experiment ${data.experimentId} not found in collection ${data.collectionName}`,
    );
  }

  // Use shared utility to delete experiment
  const result = await deleteExperimentById(
    app.firestore(),
    data.experimentId,
    experimenterId,
    {collectionName: data.collectionName},
  );

  if (!result.success && result.error === 'not-found') {
    throw new HttpsError(
      'not-found',
      `Experiment ${data.experimentId} not found in collection ${data.collectionName}`,
    );
  }

  return {success: result.success};
});

// ************************************************************************* //
// forkExperiment endpoint                                                   //
// (create a copy of an experiment with all stages and agents)               //
//                                                                           //
// Input structure: { collectionName, experimentId, newName? }               //
// Access: Only public experiments or experiments owned by the requester     //
// ************************************************************************* //
export const forkExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  const {collectionName, experimentId, newName} = data;

  if (!collectionName || !experimentId) {
    throw new HttpsError(
      'invalid-argument',
      'collectionName and experimentId are required',
    );
  }

  const experimenterId = request.auth?.token.email?.toLowerCase() || '';

  const result = await forkExperimentById(
    app.firestore(),
    experimentId,
    experimenterId,
    {collectionName, newName},
  );

  if (!result.success) {
    if (result.error === 'not-found') {
      throw new HttpsError('not-found', `Experiment ${experimentId} not found`);
    } else if (result.error === 'access-denied') {
      throw new HttpsError(
        'permission-denied',
        'Cannot fork this experiment. Only public experiments or your own experiments can be forked.',
      );
    }
  }

  return {id: result.id};
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
      .collection(data.collectionName)
      .doc(data.experimentId)
      .get()
  ).data() as Experiment | undefined;

  if (!experiment) {
    throw new HttpsError(
      'not-found',
      `Experiment ${data.experimentId} not found in collection ${data.collectionName}`,
    );
  }

  const template = createExperimentTemplate({
    id: data.experimentId,
    experiment,
  });

  // Add stage configs
  const stageConfigs = (
    await app
      .firestore()
      .collection(data.collectionName)
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
    .collection(data.collectionName)
    .doc(data.experimentId)
    .collection('agentMediators');

  const mediatorAgents = (await agentMediatorCollection.get()).docs.map(
    (agent) => agent.data() as AgentMediatorPersonaConfig,
  );
  for (const persona of mediatorAgents) {
    const mediatorPrompts = (
      await app
        .firestore()
        .collection(data.collectionName)
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
    .collection(data.collectionName)
    .doc(data.experimentId)
    .collection('agentParticipants');
  const participantAgents = (await agentParticipantCollection.get()).docs.map(
    (agent) => agent.data() as AgentParticipantPersonaConfig,
  );
  for (const persona of participantAgents) {
    const participantPrompts = (
      await app
        .firestore()
        .collection(data.collectionName)
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
    .collection('experiments')
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

    if (!experimentDownload) {
      return {data: null};
    }

    const response: ExperimentDownloadResponse = {
      data: experimentDownload,
    };

    return response;
  } catch (error) {
    console.error('Error downloading experiment:', error);
    return {data: null};
  }
});
