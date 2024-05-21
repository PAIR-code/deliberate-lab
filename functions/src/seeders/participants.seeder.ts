import { fakeName } from './names-generator';

/**
 * Create dummy participants with prefilled data
 */
export class ParticipantSeeder {
  /**
   *
   * @param experimentId the experiment this participant belongs to
   * @param stages the empty stages of the experiment, for this participant
   */
  public static create(experimentId: string, stageMap: Record<string, object>) {
    return {
      experimentId,
      stageMap,
      acceptTosTimestamp: null,
      futureStageNames: Object.keys(stageMap).slice(1),
      workingOnStageName: Object.keys(stageMap)[0],
      completedStageNames: [],
      name: fakeName(),
      pronouns: null,
      avatarUrl: null,
    };
  }

  public static createMany(experimentId: string, stageMap: Record<string, object>, count: number) {
    const participants = [];
    for (let i = 0; i < count; i++) {
      participants.push(this.create(experimentId, stageMap));
    }
    return participants;
  }
}
