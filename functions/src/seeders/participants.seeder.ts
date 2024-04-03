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
  public static create(experimentId: string, stages: object[]) {
    return {
      experimentId,
      stages,
      name: fakeName(),
      pronouns: null,
      avatarUrl: null,
    };
  }

  public static createMany(experimentId: string, stages: object[], count: number) {
    const participants = [];
    for (let i = 0; i < count; i++) {
      participants.push(this.create(experimentId, stages));
    }
    return participants;
  }
}
