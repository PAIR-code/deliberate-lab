import {validateInfoStageConfig} from './info_stage.validation';
import {createInfoStage} from './info_stage';

describe('validateInfoStageConfig', () => {
  it('should pass with default configuration (no timer)', () => {
    const stage = createInfoStage();
    expect(validateInfoStageConfig(stage)).toEqual({valid: true});
  });

  it('should pass when timeMinimumInMinutes <= timeLimitInMinutes', () => {
    const stage = createInfoStage({
      timeLimitInMinutes: 10,
      timeMinimumInMinutes: 5,
    });
    expect(validateInfoStageConfig(stage)).toEqual({valid: true});
  });

  it('should pass when timeMinimumInMinutes equals timeLimitInMinutes', () => {
    const stage = createInfoStage({
      timeLimitInMinutes: 5,
      timeMinimumInMinutes: 5,
    });
    expect(validateInfoStageConfig(stage)).toEqual({valid: true});
  });

  it('should pass when only timeLimitInMinutes is set', () => {
    const stage = createInfoStage({
      timeLimitInMinutes: 5,
      timeMinimumInMinutes: null,
    });
    expect(validateInfoStageConfig(stage)).toEqual({valid: true});
  });

  it('should pass when only timeMinimumInMinutes is set', () => {
    const stage = createInfoStage({
      timeLimitInMinutes: null,
      timeMinimumInMinutes: 5,
    });
    expect(validateInfoStageConfig(stage)).toEqual({valid: true});
  });

  it('should fail when timeMinimumInMinutes exceeds timeLimitInMinutes', () => {
    const stage = createInfoStage({
      timeLimitInMinutes: 5,
      timeMinimumInMinutes: 10,
    });
    const res = validateInfoStageConfig(stage);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain(
        'timeMinimumInMinutes (10) cannot exceed timeLimitInMinutes (5)',
      );
    }
  });
});
