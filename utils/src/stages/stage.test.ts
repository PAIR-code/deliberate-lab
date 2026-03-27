import {STAGE_KIND_REQUIRES_TRANSFER_MIGRATION, StageKind} from './stage';

describe('STAGE_KIND_REQUIRES_TRANSFER_MIGRATION', () => {
  it('should have an entry for every StageKind', () => {
    const allKinds = Object.values(StageKind);
    const mappedKinds = Object.keys(STAGE_KIND_REQUIRES_TRANSFER_MIGRATION);
    expect(mappedKinds.sort()).toEqual(allKinds.sort());
  });
});
