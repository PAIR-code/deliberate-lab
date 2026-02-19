import {STAGE_KIND_REQUIRES_TRANSFER_MIGRATION} from '@deliberation-lab/utils';
import {TRANSFER_MIGRATION_HANDLERS} from './participant.utils';

describe('TRANSFER_MIGRATION_HANDLERS', () => {
  it('should have a handler for every stage kind that requires transfer migration', () => {
    const kindsRequiringMigration = Object.entries(
      STAGE_KIND_REQUIRES_TRANSFER_MIGRATION,
    )
      .filter(([, required]) => required)
      .map(([kind]) => kind)
      .sort();

    const kindsWithHandlers = Object.keys(TRANSFER_MIGRATION_HANDLERS).sort();

    expect(kindsWithHandlers).toEqual(kindsRequiringMigration);
  });
});
