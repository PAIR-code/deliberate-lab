import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentModelSettings,
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
  ModelGenerationConfig,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {updateParticipantNextStage} from './participant.utils';
import {initiateChatDiscussion} from './stages/chat.utils';
import {completeProfile} from './stages/profile.utils';
import {getAgentParticipantRankingStageResponse} from './stages/ranking.agent';
import {getAgentParticipantSurveyStageResponse} from './stages/survey.agent';
import {
  getExperimenterData,
  getFirestoreParticipantRef,
  getFirestoreStage,
} from './utils/firestore';

import {app} from './app';

/** Complete agent participant's current stage. */
export async function completeStageAsAgentParticipant(
  experiment: Experiment,
  participant: ParticipantProfileExtended,
) {
  const experimentId = experiment.id;
  const participantDoc = getFirestoreParticipantRef(
    experimentId,
    participant.privateId,
  );

  // Only update if participant is active, etc.
  const status = participant.currentStatus;
  if (status !== ParticipantStatus.IN_PROGRESS) {
    return;
  }

  // Ensure participants have start experiment, TOS, and current stage
  // ready marked appropriately
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

  const completeStage = async () => {
    await updateParticipantNextStage(
      experimentId,
      participant,
      experiment.stageIds,
    );
  };

  const stage = await getFirestoreStage(
    experimentId,
    participant.currentStageId,
  );

  // Fetch experiment creator's API key.
  const creatorId = experiment.metadata.creator;
  const experimenterData = await getExperimenterData(creatorId);

  // ParticipantAnswer doc
  const answerDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participant.privateId)
    .collection('stageData')
    .doc(stage.id);

  switch (stage.kind) {
    case StageKind.CHAT:
      // Do not complete stage as agent participant must chat first
      // Instead, check if participant should initiate conversation
      initiateChatDiscussion(
        experimentId,
        participant.currentCohortId,
        stage,
        participant.privateId,
        participant.publicId,
        participant, // profile
        participant.agentConfig, // agent config
      );
      break;
    case StageKind.PROFILE:
      await completeProfile(experimentId, participant, stage);
      await completeStage();
      participantDoc.set(participant);
      break;
    case StageKind.SALESPERSON:
      initiateChatDiscussion(
        experimentId,
        participant.currentCohortId,
        stage,
        participant.privateId,
        participant.publicId,
        participant, // profile
        participant.agentConfig, // agent config
      );
      break;
    case StageKind.RANKING:
      if (!experimenterData) {
        console.log('Could not find experimenter data and API key');
        break;
      }
      const rankingAnswer = await getAgentParticipantRankingStageResponse(
        experimentId,
        experimenterData,
        participant,
        stage,
      );
      answerDoc.set(rankingAnswer);
      await completeStage();
      participantDoc.set(participant);
      break;
    case StageKind.SURVEY:
      if (!experimenterData) {
        console.log('Could not find experimenter data and API key');
        break;
      }
      const surveyAnswer = await getAgentParticipantSurveyStageResponse(
        experimentId,
        experimenterData,
        participant,
        stage,
      );
      answerDoc.set(surveyAnswer);
      await completeStage();
      participantDoc.set(participant);
      break;
    default:
      console.log(`Move to next stage (${participant.publicId})`);
      await completeStage();
      participantDoc.set(participant);
  }
}
