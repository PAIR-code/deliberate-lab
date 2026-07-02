import {
  ChatStageConfig,
  ChatStagePublicData,
  getTurnCycleInfo,
} from './chat_stage';

describe('getTurnCycleInfo', () => {
  const stage = (
    maxNumberOfMessages: number | null,
    isTurnBased = true,
  ): ChatStageConfig => ({isTurnBased, maxNumberOfMessages}) as ChatStageConfig;

  const publicData = (
    overrides: Partial<ChatStagePublicData> = {},
  ): ChatStagePublicData =>
    ({
      turnOrder: ['a', 'b', 'c'],
      cycleIndex: 0,
      ...overrides,
    }) as ChatStagePublicData;

  it('computes current/total cycles from cap and turn-order length', () => {
    // 3 speakers per cycle, cap 9 => 3 cycles.
    expect(getTurnCycleInfo(publicData({cycleIndex: 0}), stage(9))).toEqual({
      currentCycle: 1,
      totalCycles: 3,
    });
    expect(getTurnCycleInfo(publicData({cycleIndex: 2}), stage(9))).toEqual({
      currentCycle: 3,
      totalCycles: 3,
    });
  });

  it('rounds total cycles up when the cap is not a clean multiple', () => {
    // 3 speakers, cap 19 => ceil(19 / 3) = 7 cycles.
    expect(getTurnCycleInfo(publicData(), stage(19))?.totalCycles).toBe(7);
  });

  it('clamps the current cycle to the total', () => {
    expect(
      getTurnCycleInfo(publicData({cycleIndex: 99}), stage(9))?.currentCycle,
    ).toBe(3);
  });

  it('prefers effectiveMaxNumberOfMessages over the stage value', () => {
    expect(
      getTurnCycleInfo(publicData({effectiveMaxNumberOfMessages: 6}), stage(9))
        ?.totalCycles,
    ).toBe(2);
  });

  it('returns null when not turn-based, uncapped, or turn order is empty', () => {
    expect(getTurnCycleInfo(publicData(), stage(9, false))).toBeNull();
    expect(getTurnCycleInfo(publicData(), stage(null))).toBeNull();
    expect(getTurnCycleInfo(publicData({turnOrder: []}), stage(9))).toBeNull();
    expect(getTurnCycleInfo(undefined, stage(9))).toBeNull();
  });
});
