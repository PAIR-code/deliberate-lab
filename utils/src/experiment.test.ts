import {createExperimentConfig} from './experiment';

describe('createExperimentConfig', () => {
  it('should keep the turn-based timeout settings that were passed in', () => {
    const experiment = createExperimentConfig([], {
      timeoutMessageLimit: 3,
      useNeutralTimeoutResponses: true,
    });
    expect(experiment.timeoutMessageLimit).toBe(3);
    expect(experiment.useNeutralTimeoutResponses).toBe(true);
  });

  it('should keep an explicit null limit, which means no limit', () => {
    const experiment = createExperimentConfig([], {timeoutMessageLimit: null});
    expect(experiment.timeoutMessageLimit).toBeNull();
  });

  it('should leave both unset when they were not passed in', () => {
    const experiment = createExperimentConfig([]);
    expect(experiment.timeoutMessageLimit).toBeUndefined();
    expect(experiment.useNeutralTimeoutResponses).toBeUndefined();
  });
});
