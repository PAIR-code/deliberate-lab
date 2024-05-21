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
    };
  }
}
