import { StagesSeeder } from './stages.seeder';

/** Default experiment template generator.
 * It only returns the base template, there is no random generation.
 */
export class TemplatesSeeder {
  public static create() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageMap: Record<string, any> = {};
    const stages = StagesSeeder.createMany();

    stages.forEach((stage) => {
      stageMap[stage.name] = stage;
    });

    return {
      name: 'Default template',
      stageMap,
      allowedStageProgressionMap: {
        '1. Agree to the experiment and set your profile': false,
        '2. Initial leadership survey': true,
        '3. Group discussion': false,
        '4. Post-chat survey': true,
        '5. Post-discussion leadership survey': true,
        '6. Vote for the leader': true,
        '7. Post-discussion work': true,
        '8. Leader reveal': false,
        '9. final satisfaction survey': true,
      },
    };
  }
}
