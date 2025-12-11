import {
  AckAlertMessageData,
  AgentConfigTestData,
  DeliberateLabAPIKeyPermission,
  BaseParticipantData,
  CreateChatMessageData,
  CohortCreationData,
  CohortDeletionData,
  CreateParticipantData,
  CreateMediatorData,
  CreationResponse,
  ExperimentCohortLockData,
  ExperimentCreationData,
  ExperimentDeletionData,
  ExperimentDownloadResponse,
  ExperimentTemplate,
  InitiateParticipantTransferData,
  ParticipantNextStageResponse,
  ParticipantProfile,
  RequestChipAssistanceData,
  SendAlertMessageData,
  SendChipOfferData,
  SendChipResponseData,
  SendParticipantCheckData,
  SetChipTurnData,
  SetParticipantRolesData,
  SetSalespersonControllerData,
  SetSalespersonMoveData,
  SetSalespersonResponseData,
  SimpleResponse,
  SuccessResponse,
  UpdateAssetAllocationStageParticipantAnswerData,
  UpdateMultiAssetAllocationStageParticipantAnswerData,
  UpdateChatStageParticipantAnswerData,
  UpdateCohortMetadataData,
  UpdateFlipCardStageParticipantAnswerData,
  UpdateMediatorStatusData,
  UpdateParticipantAcceptedTOSData,
  UpdateParticipantFailureData,
  UpdateParticipantProfileData,
  UpdateParticipantStatusData,
  UpdateParticipantWaitingData,
  UpdateRankingStageParticipantAnswerData,
  UpdateSurveyPerParticipantStageParticipantAnswerData,
  UpdateSurveyStageParticipantAnswerData,
} from '@deliberation-lab/utils';

import {Functions, httpsCallable} from 'firebase/functions';

/** Firebase cloud function callables */

/** Generic endpoint to write experiments or experiment templates */
export const writeExperimentCallable = async (
  functions: Functions,
  experiment: ExperimentCreationData,
) => {
  const {data} = await httpsCallable<ExperimentCreationData, CreationResponse>(
    functions,
    'writeExperiment',
  )(experiment);
  return data;
};

/** Generic endpoint to update experiments or experiment templates */
export const updateExperimentCallable = async (
  functions: Functions,
  experiment: ExperimentCreationData,
) => {
  const {data} = await httpsCallable<ExperimentCreationData, SuccessResponse>(
    functions,
    'updateExperiment',
  )(experiment);
  return data;
};

/** Generic endpoint to delete experiments or experiment templates */
export const deleteExperimentCallable = async (
  functions: Functions,
  deletion: ExperimentDeletionData,
) => {
  const {data} = await httpsCallable<ExperimentDeletionData, SuccessResponse>(
    functions,
    'deleteExperiment',
  )(deletion);
  return data;
};

/** Generic endpoint to get experiment template. */
export const getExperimentTemplateCallable = async (
  functions: Functions,
  config: ExperimentDeletionData,
) => {
  const {data} = await httpsCallable<
    ExperimentDeletionData,
    ExperimentTemplate
  >(
    functions,
    'getExperimentTemplate',
  )(config);
  return data;
};

/** Fork an experiment (create a copy with all stages and agents). */
export const forkExperimentCallable = async (
  functions: Functions,
  config: {collectionName: string; experimentId: string; newName?: string},
) => {
  const {data} = await httpsCallable<
    {collectionName: string; experimentId: string; newName?: string},
    CreationResponse
  >(
    functions,
    'forkExperiment',
  )(config);
  return data;
};

/** Generic endpoint to download experiment data. */
export const downloadExperimentCallable = async (
  functions: Functions,
  experimentId: string,
) => {
  const {data} = await httpsCallable<
    {experimentId: string},
    ExperimentDownloadResponse
  >(
    functions,
    'downloadExperiment',
  )({experimentId});
  return data;
};

/** Generic endpoint to set experiment cohort lock */
export const setExperimentCohortLockCallable = async (
  functions: Functions,
  config: ExperimentCohortLockData,
) => {
  const {data} = await httpsCallable<ExperimentCohortLockData, SuccessResponse>(
    functions,
    'setExperimentCohortLock',
  )(config);
  return data;
};

/** Generic endpoint to create new cohorts */
export const createCohortCallable = async (
  functions: Functions,
  cohort: CohortCreationData,
) => {
  const {data} = await httpsCallable<CohortCreationData, CreationResponse>(
    functions,
    'createCohort',
  )(cohort);
  return data;
};

/** Generic endpoint to update existing cohorts */
export const updateCohortMetadataCallable = async (
  functions: Functions,
  cohort: UpdateCohortMetadataData,
) => {
  const {data} = await httpsCallable<UpdateCohortMetadataData, SuccessResponse>(
    functions,
    'updateCohortMetadata',
  )(cohort);
  return data;
};

/** Generic endpoint to delete cohorts */
export const deleteCohortCallable = async (
  functions: Functions,
  cohort: CohortDeletionData,
) => {
  const {data} = await httpsCallable<CohortDeletionData, SuccessResponse>(
    functions,
    'deleteCohort',
  )(cohort);
  return data;
};

/** Generic endpoint to create participants */
export const createParticipantCallable = async (
  functions: Functions,
  config: CreateParticipantData,
) => {
  const {data} = await httpsCallable<CreateParticipantData, CreationResponse>(
    functions,
    'createParticipant',
  )(config);
  return data;
};

/** Generic endpoint to update participant's TOS response */
export const updateParticipantAcceptedTOSCallable = async (
  functions: Functions,
  config: UpdateParticipantAcceptedTOSData,
) => {
  const {data} = await httpsCallable<
    UpdateParticipantAcceptedTOSData,
    SuccessResponse
  >(
    functions,
    'updateParticipantAcceptedTOS',
  )(config);
  return data;
};

/** Generic endpoint to update participant's waiting timestamp */
export const updateParticipantWaitingCallable = async (
  functions: Functions,
  config: UpdateParticipantWaitingData,
) => {
  const {data} = await httpsCallable<
    UpdateParticipantWaitingData,
    SuccessResponse
  >(
    functions,
    'updateParticipantWaiting',
  )(config);
  return data;
};

/** Generic endpoint to update participant's failed status */
export const updateParticipantFailureCallable = async (
  functions: Functions,
  config: UpdateParticipantFailureData,
) => {
  const {data} = await httpsCallable<
    UpdateParticipantFailureData,
    SuccessResponse
  >(
    functions,
    'updateParticipantFailure',
  )(config);
  return data;
};

/** Generic endpoint to update participant base profile (name, avatar, pronouns). */
export const updateParticipantProfileCallable = async (
  functions: Functions,
  config: UpdateParticipantProfileData,
) => {
  const {data} = await httpsCallable<
    UpdateParticipantProfileData,
    SuccessResponse
  >(
    functions,
    'updateParticipantProfile',
  )(config);
  return data;
};

/** Generic endpoint to progress participant to next stage */
export const updateParticipantToNextStageCallable = async (
  functions: Functions,
  config: BaseParticipantData,
) => {
  const {data} = await httpsCallable<
    BaseParticipantData,
    ParticipantNextStageResponse
  >(
    functions,
    'updateParticipantToNextStage',
  )(config);
  return data;
};

/** Generic endpoint to send participant checks. */
export const sendParticipantCheckCallable = async (
  functions: Functions,
  config: SendParticipantCheckData,
) => {
  const {data} = await httpsCallable<SendParticipantCheckData, SuccessResponse>(
    functions,
    'sendParticipantCheck',
  )(config);
  return data;
};

/** Generic endpoint to initiate participant transfer. */
export const initiateParticipantTransferCallable = async (
  functions: Functions,
  config: InitiateParticipantTransferData,
) => {
  const {data} = await httpsCallable<
    InitiateParticipantTransferData,
    SuccessResponse
  >(
    functions,
    'initiateParticipantTransfer',
  )(config);
  return data;
};

/** Generic endpoint to boot participant. */
export const bootParticipantCallable = async (
  functions: Functions,
  config: BaseParticipantData,
) => {
  const {data} = await httpsCallable<BaseParticipantData, SuccessResponse>(
    functions,
    'bootParticipant',
  )(config);
  return data;
};

/** Generic endpoint to accept participant transfer. */
export const acceptParticipantTransferCallable = async (
  functions: Functions,
  config: BaseParticipantData,
) => {
  const {data} = await httpsCallable<
    BaseParticipantData,
    ParticipantNextStageResponse
  >(
    functions,
    'acceptParticipantTransfer',
  )(config);
  return data;
};

/** Generic endpoint to start experiment for participants. */
export const acceptParticipantCheckCallable = async (
  functions: Functions,
  config: BaseParticipantData,
) => {
  const {data} = await httpsCallable<BaseParticipantData, SuccessResponse>(
    functions,
    'acceptParticipantCheck',
  )(config);
  return data;
};

/** Generic endpoint to start experiment for participants. */
export const acceptParticipantExperimentStartCallable = async (
  functions: Functions,
  config: BaseParticipantData,
) => {
  const {data} = await httpsCallable<BaseParticipantData, SuccessResponse>(
    functions,
    'acceptParticipantExperimentStart',
  )(config);
  return data;
};

/** Generic endpoint to update chat stage participant answers */
export const updateChatStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateChatStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateChatStageParticipantAnswerData,
    CreationResponse
  >(
    functions,
    'updateChatStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to update flipcard stage participant answers */
export const updateFlipCardStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateFlipCardStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateFlipCardStageParticipantAnswerData,
    SuccessResponse
  >(
    functions,
    'updateFlipCardStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to update asset allocation stage participant answers */
export const updateAssetAllocationStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateAssetAllocationStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateAssetAllocationStageParticipantAnswerData,
    SuccessResponse
  >(
    functions,
    'updateAssetAllocationStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to update multi asset allocation stage participant answers */
export const updateMultiAssetAllocationStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateMultiAssetAllocationStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateMultiAssetAllocationStageParticipantAnswerData,
    SuccessResponse
  >(
    functions,
    'updateMultiAssetAllocationStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to update survey stage participant answers */
export const updateSurveyStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateSurveyStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateSurveyStageParticipantAnswerData,
    CreationResponse
  >(
    functions,
    'updateSurveyStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to update survey-per-participant stage participant answers */
export const updateSurveyPerParticipantStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateSurveyPerParticipantStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateSurveyPerParticipantStageParticipantAnswerData,
    CreationResponse
  >(
    functions,
    'updateSurveyPerParticipantStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to update ranking stage participant answers */
export const updateRankingStageParticipantAnswerCallable = async (
  functions: Functions,
  config: UpdateRankingStageParticipantAnswerData,
) => {
  const {data} = await httpsCallable<
    UpdateRankingStageParticipantAnswerData,
    CreationResponse
  >(
    functions,
    'updateRankingStageParticipantAnswer',
  )(config);
  return data;
};

/** Generic endpoint to write chat message. */
export const createChatMessageCallable = async (
  functions: Functions,
  config: CreateChatMessageData,
) => {
  const {data} = await httpsCallable<CreateChatMessageData, CreationResponse>(
    functions,
    'createChatMessage',
  )(config);
  return data;
};

/** Generic endpoint for assigning participants to roles for role stage. */
export const setParticipantRolesCallable = async (
  functions: Functions,
  config: SetParticipantRolesData,
) => {
  const {data} = await httpsCallable<SetParticipantRolesData, SuccessResponse>(
    functions,
    'setParticipantRoles',
  )(config);
  return data;
};

/** Generic endpoint for sending chip negotiation offer. */
export const sendChipOfferCallable = async (
  functions: Functions,
  config: SendChipOfferData,
) => {
  const {data} = await httpsCallable<SendChipOfferData, SuccessResponse>(
    functions,
    'sendChipOffer',
  )(config);
  return data;
};

/** Generic endpoint for sending chip negotiation response. */
export const sendChipResponseCallable = async (
  functions: Functions,
  config: SendChipResponseData,
) => {
  const {data} = await httpsCallable<SendChipResponseData, SuccessResponse>(
    functions,
    'sendChipResponse',
  )(config);
  return data;
};

/** Generic endpoint for setting chip turn. */
export const setChipTurnCallable = async (
  functions: Functions,
  config: SetChipTurnData,
) => {
  const {data} = await httpsCallable<SetChipTurnData, SuccessResponse>(
    functions,
    'setChipTurn',
  )(config);
  return data;
};

/** Generic endpoint for chip assistance. */
export const requestChipAssistanceCallable = async (
  functions: Functions,
  config: RequestChipAssistanceData,
) => {
  const {data} = await httpsCallable<
    RequestChipAssistanceData,
    SimpleResponse<string>
  >(
    functions,
    'requestChipAssistance',
  )(config);
  return data;
};

/** Generic endpoint for selecting chip assistance mode. */
export const selectChipAssistanceModeCallable = async (
  functions: Functions,
  config: RequestChipAssistanceData,
) => {
  const {data} = await httpsCallable<
    RequestChipAssistanceData,
    SimpleResponse<string>
  >(
    functions,
    'selectChipAssistanceMode',
  )(config);
  return data;
};

/** Generic endpoint for setting salesperson controller. */
export const setSalespersonControllerCallable = async (
  functions: Functions,
  config: SetSalespersonControllerData,
) => {
  const {data} = await httpsCallable<
    SetSalespersonControllerData,
    SuccessResponse
  >(
    functions,
    'setSalespersonController',
  )(config);
  return data;
};

/** Generic endpoint for setting salesperson move. */
export const setSalespersonMoveCallable = async (
  functions: Functions,
  config: SetSalespersonMoveData,
) => {
  const {data} = await httpsCallable<SetSalespersonMoveData, SuccessResponse>(
    functions,
    'setSalespersonMove',
  )(config);
  return data;
};

/** Generic endpoint for setting salesperson response. */
export const setSalespersonResponseCallable = async (
  functions: Functions,
  config: SetSalespersonResponseData,
) => {
  const {data} = await httpsCallable<
    SetSalespersonResponseData,
    SuccessResponse
  >(
    functions,
    'setSalespersonResponse',
  )(config);
  return data;
};

/** Generic endpoint for creating MediatorProfile. */
export const createMediatorCallable = async (
  functions: Functions,
  config: CreateMediatorData,
) => {
  const {data} = await httpsCallable<CreateMediatorData, CreationResponse>(
    functions,
    'createMediator',
  )(config);
  return data;
};

/** Generic endpoint for updating MediatorProfile status. */
export const updateMediatorStatusCallable = async (
  functions: Functions,
  config: UpdateMediatorStatusData,
) => {
  const {data} = await httpsCallable<UpdateMediatorStatusData, SuccessResponse>(
    functions,
    'updateMediatorStatus',
  )(config);
  return data;
};

/** Generic endpoint for updating Participant status. */
export const updateParticipantStatusCallable = async (
  functions: Functions,
  config: UpdateParticipantStatusData,
) => {
  const {data} = await httpsCallable<
    UpdateParticipantStatusData,
    SuccessResponse
  >(
    functions,
    'updateParticipantStatus',
  )(config);
  return data;
};

/** Generic endpoint for testing agent config. */
export const testAgentConfigCallable = async (
  functions: Functions,
  config: AgentConfigTestData,
) => {
  const {data} = await httpsCallable<
    AgentConfigTestData,
    SimpleResponse<string>
  >(
    functions,
    'testAgentConfig',
  )(config);
  return data;
};

/** Generic endpoint for sending alert message. */
export const sendAlertMessageCallable = async (
  functions: Functions,
  config: SendAlertMessageData,
) => {
  const {data} = await httpsCallable<
    SendAlertMessageData,
    SimpleResponse<string>
  >(
    functions,
    'sendAlertMessage',
  )(config);
  return data;
};

/** Generic endpoint for acknowledging alert message. */
export const ackAlertMessageCallable = async (
  functions: Functions,
  config: AckAlertMessageData,
) => {
  const {data} = await httpsCallable<
    AckAlertMessageData,
    SimpleResponse<string>
  >(
    functions,
    'ackAlertMessage',
  )(config);
  return data;
};

/** Create a Deliberate Lab API key. */
export const createDeliberateLabAPIKeyCallable = async (
  functions: Functions,
  keyName: string,
  permissions?: DeliberateLabAPIKeyPermission[],
) => {
  const {data} = await httpsCallable<
    {keyName: string; permissions?: DeliberateLabAPIKeyPermission[]},
    {success: boolean; apiKey: string; keyId: string; message: string}
  >(
    functions,
    'createDeliberateLabAPIKey',
  )({keyName, permissions});
  return data;
};

/** List Deliberate Lab API keys. */
export const listDeliberateLabAPIKeysCallable = async (
  functions: Functions,
) => {
  const {data} = await httpsCallable<
    undefined,
    {
      success: boolean;
      keys: Array<{
        keyId: string;
        name: string;
        createdAt: number;
        lastUsed: number | null;
        permissions: DeliberateLabAPIKeyPermission[];
      }>;
    }
  >(functions, 'listDeliberateLabAPIKeys')();
  return data;
};

/** Revoke a Deliberate Lab API key. */
export const revokeDeliberateLabAPIKeyCallable = async (
  functions: Functions,
  keyId: string,
) => {
  const {data} = await httpsCallable<
    {keyId: string},
    {success: boolean; message: string}
  >(
    functions,
    'revokeDeliberateLabAPIKey',
  )({keyId});
  return data;
};
