/** Generate the metadata for an example experiment.
 * The Firebase document ID will serve as the experiment ID.
 */
export class ExperimentSeeder {
  public static create() {
    return {
      name: 'Example experiment',
      date: new Date().toISOString(),
      numberOfParticipants: 3,
    };
  }
}
