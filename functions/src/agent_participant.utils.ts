import {Timestamp} from 'firebase-admin/firestore';
import {
  Experiment,
  ExperimenterData,
  ModelResponseStatus,
  ParticipantProfileExtended,
  ParticipantPromptConfig,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {processModelResponse} from './agent.utils';
import {app, stageManager} from './app';
import {
  updateCohortStageUnlocked,
  updateParticipantNextStage,
} from './participant.utils';
import {getPromptFromConfig} from './structured_prompt.utils';
import {
  getExperimenterData,
  getFirestoreParticipantRef,
  getFirestoreStage,
} from './utils/firestore';

import {Transaction} from 'firebase-admin/firestore';

/** Complete agent participant's current stage. */
export async function completeStageAsAgentParticipant(
  experiment: Experiment,
  participant: ParticipantProfileExtended,
) {
  const experimentId = experiment.id;
  console.log(
    `[AgentParticipant] completeStageAsAgentParticipant called for ${participant.publicId}, stage: ${participant.currentStageId}, status: ${participant.currentStatus}`,
  );

  const participantDoc = getFirestoreParticipantRef(
    experimentId,
    participant.privateId,
  );
  const stage = await getFirestoreStage(
    experimentId,
    participant.currentStageId,
  );

  if (!stage) {
    console.error(
      `[AgentParticipant] Could not find stage ${participant.currentStageId} for experiment ${experimentId}`,
    );
    return;
  }

  console.log(`[AgentParticipant] Stage kind: ${stage.kind}`);

  const status = participant.currentStatus;
  let updatedStatus = false;

  // Ensure participants have start experiment, TOS, and current stage
  // ready marked appropriately
  if (!participant.timestamps.startExperiment) {
    participant.timestamps.startExperiment = Timestamp.now();
    updatedStatus = true;
  }
  if (!participant.timestamps.acceptedTOS) {
    participant.timestamps.acceptedTOS = Timestamp.now();
    updatedStatus = true;
  }
  if (!participant.timestamps.readyStages[participant.currentStageId]) {
    participant.timestamps.readyStages[participant.currentStageId] =
      Timestamp.now();
    updatedStatus = true;
  }

  // Transfer logic: if pending, update timestamp, cohort ID, and status
  if (status === ParticipantStatus.TRANSFER_PENDING) {
    const timestamp = Timestamp.now();
    participant.timestamps.cohortTransfers[participant.currentCohortId] =
      timestamp;
    participant.currentCohortId = participant.transferCohortId;
    participant.transferCohortId = null;

    participant.currentStatus = ParticipantStatus.IN_PROGRESS;
    // If in a transfer stage, progress to next stage
    if (stage.kind === StageKind.TRANSFER) {
      await updateParticipantNextStage(
        experimentId,
        participant,
        experiment.stageIds,
      );
    }
    participantDoc.set(participant);
    return;
  } else if (status !== ParticipantStatus.IN_PROGRESS) {
    // Only update if participant is active, etc.
    return;
  }
  // NOTE: Attention checks are handled in agent participant trigger

  // Fetch experiment creator's API key.
  const creatorId = experiment.metadata.creator;
  const experimenterData = await getExperimenterData(creatorId);

  // Call stage manager to perform stage-specific actions
  const stageActions = stageManager.getAgentParticipantActionsForStage(
    participant,
    stage,
  );

  console.log(
    `[AgentParticipant] stageActions for ${participant.publicId}: callApi=${stageActions.callApi}, moveToNextStage=${stageActions.moveToNextStage}`,
  );

  if (stageActions.callApi) {
    console.log(
      `[AgentParticipant] Calling API for ${participant.publicId}...`,
    );
    const response = await getParsedAgentParticipantPromptResponse(
      experimenterData,
      experiment.id,
      participant.currentCohortId,
      participant.currentStageId,
      participant,
      // TODO: Try fetching custom participant prompt first
      stageManager.getDefaultParticipantStructuredPrompt(stage),
    );
    console.log(
      `[AgentParticipant] API response for ${participant.publicId}:`,
      response ? JSON.stringify(response) : 'null',
    );
    if (response) {
      const answer = stageManager.extractAgentParticipantAnswerFromResponse(
        participant,
        stage,
        response,
      );
      console.log(
        `[AgentParticipant] Extracted answer for ${participant.publicId}:`,
        answer ? JSON.stringify(answer) : 'undefined',
      );
      // If profile stage, no action needed as there is no "answer"
      // TODO: Consider making "set profile" not part of a stage
      // Otherwise, write answer to storage
      if (answer && stage.kind !== StageKind.PROFILE) {
        // Write answer to storage
        const answerDoc = app
          .firestore()
          .collection('experiments')
          .doc(experiment.id)
          .collection('participants')
          .doc(participant.privateId)
          .collection('stageData')
          .doc(stage.id);
        console.log(
          `[AgentParticipant] Writing answer to stageData for ${participant.publicId}`,
        );
        answerDoc.set(answer);
      }
      // For profile stage, log that the participant object was modified
      if (stage.kind === StageKind.PROFILE) {
        console.log(
          `[AgentParticipant] Profile stage - participant updated: name=${participant.name}, avatar=${participant.avatar}, pronouns=${participant.pronouns}`,
        );
      }
    }
  }

  if (stageActions.moveToNextStage) {
    console.log(
      `[AgentParticipant] Moving ${participant.publicId} to next stage...`,
    );
    await updateParticipantNextStage(
      experimentId,
      participant,
      experiment.stageIds,
    );
    console.log(
      `[AgentParticipant] ${participant.publicId} now on stage ${participant.currentStageId}`,
    );
  }

  // Write ParticipantAnswer doc if profile has been updated
  if (stageActions.moveToNextStage || updatedStatus) {
    console.log(
      `[AgentParticipant] Writing participant doc for ${participant.publicId} (moveToNextStage=${stageActions.moveToNextStage}, updatedStatus=${updatedStatus})`,
    );
    await participantDoc.set(participant);
    console.log(
      `[AgentParticipant] Participant doc written for ${participant.publicId}`,
    );
  }
}

/** Call model with agent participant prompt and return parsed response. */
export async function getParsedAgentParticipantPromptResponse(
  experimenterData: ExperimenterData | undefined,
  experimentId: string,
  cohortId: string,
  stageId: string,
  participant: ParticipantProfileExtended,
  promptConfig: ParticipantPromptConfig | undefined,
) {
  const agentConfig = participant.agentConfig;
  if (!experimenterData || !agentConfig || !promptConfig) {
    // Log that API key, agent config, or prompt was not found
    return null;
  }

  const structuredPrompt = await getPromptFromConfig(
    experimentId,
    cohortId,
    stageId,
    participant,
    promptConfig,
  );

  // Call API and write log to storage
  const {response} = await processModelResponse(
    experimentId,
    cohortId,
    /*participantId=*/ participant.privateId,
    stageId,
    participant,
    participant.publicId,
    participant.privateId,
    /*description=*/ '',
    experimenterData.apiKeys,
    structuredPrompt,
    agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
    promptConfig.numRetries ?? 0,
  );

  if (response.status !== ModelResponseStatus.OK) {
    // TODO: Surface the error to the experimenter.
    return null;
  }

  if (!response.parsedResponse) {
    // Response is already logged in console during Gemini API call
    console.log('Could not parse JSON!');
    return null;
  }

  const parsed = response.parsedResponse;
  return parsed;
}

/** Start agent participant. */
export async function startAgentParticipant(
  experimentId: string,
  participant: ParticipantProfileExtended,
) {
  await app.firestore().runTransaction(async (transaction: Transaction) => {
    // If participant is NOT agent, do nothing
    if (!participant?.agentConfig) {
      return;
    }

    // Otherwise, accept terms of service and start experiment
    if (!participant.timestamps.startExperiment) {
      participant.timestamps.startExperiment = Timestamp.now();
    }
    if (!participant.timestamps.acceptedTOS) {
      participant.timestamps.acceptedTOS = Timestamp.now();
    }
    if (!participant.timestamps.readyStages[participant.currentStageId]) {
      participant.timestamps.readyStages[participant.currentStageId] =
        Timestamp.now();
    }
    await updateCohortStageUnlocked(
      experimentId,
      participant.currentCohortId,
      participant.currentStageId,
      participant.privateId,
    );
    const participantDoc = getFirestoreParticipantRef(
      experimentId,
      participant.privateId,
    );
    transaction.set(participantDoc, participant);
  }); // end transaction
}
