import { StagesSeeder } from './stages.seeder';

/** Default experiment template generator.
 * It only returns the base template, there is no random generation.
 */
export class TemplatesSeeder {
  public static create() {
    return {
      name: 'Default template',
      stages: StagesSeeder.createMany(),
    };
  }
}
