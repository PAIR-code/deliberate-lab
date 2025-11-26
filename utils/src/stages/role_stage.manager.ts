import {ParticipantProfileExtended} from '../participant';
import {RoleStageConfig, RoleStagePublicData} from './role_stage';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';

export class RoleStageHandler extends BaseStageHandler {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as RoleStageConfig;
    const rolePublicData = stageContext.publicData as RoleStagePublicData;
    if (!rolePublicData) {
      console.error(
        `Could not create roleInfo in stage ${stage.id}: rolePublicData is missing.`,
      );
      return '';
    }

    const getRoleDisplay = (roleId: string) => {
      return stage.roles.find((role) => role.id === roleId)?.displayLines ?? [];
    };
    const roleInfo: string[] = [];
    for (const participant of participants) {
      const role = rolePublicData.participantMap[participant.publicId];
      if (role) {
        roleInfo.push(
          `${participant.publicId}: ${getRoleDisplay(role).join('\n\n')}`,
        );
      } else {
        console.error(
          `Could not create roleInfo for participant ${participant.publicId} in stage ${stage.id}: Participant not found.`,
        );
      }
    }
    return roleInfo.join('\n');
  }
}
