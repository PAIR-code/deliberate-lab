import {ParticipantProfileExtended} from '../participant';
import {
  NegotiationProfileStageConfig,
  NegotiationProfileStagePublicData,
} from './negotiation_profile_stage';
import {StageConfig, StageContextData, StageKind} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';
import {NEGOTIATION_PROFILE_SET_ID} from '../profile_sets';

export class NegotiationProfileStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
  ): AgentParticipantStageActions {
    const negStage = stage as NegotiationProfileStageConfig;
    if (!participant.anonymousProfiles) {
      participant.anonymousProfiles = {};
    }
    if (!participant.anonymousProfiles[NEGOTIATION_PROFILE_SET_ID]) {
      const items = negStage.items;
      if (items.length > 0) {
        let hash = 0;
        for (let i = 0; i < participant.publicId.length; i++) {
          hash = (hash << 5) - hash + participant.publicId.charCodeAt(i);
          hash |= 0;
        }
        const chosenItem = items[Math.abs(hash) % items.length];
        participant.anonymousProfiles[NEGOTIATION_PROFILE_SET_ID] = {
          name: chosenItem.name,
          avatar: participant.avatar || chosenItem.avatar || '',
          repeat: 0,
        };
      }
    }
    return {callApi: false, moveToNextStage: true};
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as NegotiationProfileStageConfig;
    const publicData =
      stageContext.publicData as NegotiationProfileStagePublicData;
    if (!publicData) {
      console.error(
        `Could not create negotiationProfileInfo in stage ${stage.id}: publicData is missing.`,
      );
      return '';
    }

    const getItemDisplay = (itemId: string) => {
      const item = stage.items.find((item) => item.id === itemId);
      if (!item) return [];
      return [
        `Assigned negotiation profile: ${item.name}`,
        ...item.displayLines,
      ];
    };

    const profileInfo: string[] = [];
    for (const participant of participants) {
      let itemId = publicData.participantMap[participant.publicId];
      if (
        !itemId &&
        participant.anonymousProfiles?.[NEGOTIATION_PROFILE_SET_ID]
      ) {
        const anonName =
          participant.anonymousProfiles[NEGOTIATION_PROFILE_SET_ID].name;
        const found = stage.items.find((it) => it.name === anonName);
        if (found) itemId = found.id;
      }
      if (itemId) {
        profileInfo.push(
          `${participant.publicId}: ${getItemDisplay(itemId).join('\n\n')}`,
        );
      } else {
        console.error(
          `Could not create negotiationProfileInfo for participant ${participant.publicId} in stage ${stage.id}: Participant not assigned.`,
        );
      }
    }
    return profileInfo.join('\n');
  }
}
