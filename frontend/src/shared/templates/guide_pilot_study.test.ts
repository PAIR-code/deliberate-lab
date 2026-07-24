import {Value} from '@sinclair/typebox/value';
import {
  CONFIG_DATA,
  NEGOTIATION_PROFILE_SET_ID,
  StageConfig,
} from '@deliberation-lab/utils';
import {getGuidePilotStudyTemplate} from './guide_pilot_study';

/** Stages whose id/name marks them as part of the negotiation (Task 2) flow. */
const NEGOTIATION_MARKERS = [
  'negotiation',
  'coalition',
  'task 2:',
  'discussion-round-2',
  'final decision',
];
function isNegotiationStage(stage: StageConfig): boolean {
  const haystack = `${stage.id} ${stage.name}`.toLowerCase();
  return NEGOTIATION_MARKERS.some((marker) => haystack.includes(marker));
}

describe('guide pilot study template', () => {
  const template = getGuidePilotStudyTemplate();
  const stages = template.stageConfigs;

  it('builds a non-empty set of stages', () => {
    expect(stages.length).toBeGreaterThan(0);
  });

  it('tags every negotiation stage with the negotiation profile set', () => {
    const negotiationStages = stages.filter(isNegotiationStage);
    // Sanity: the template really does contain negotiation stages
    expect(negotiationStages.length).toBeGreaterThan(0);
    for (const stage of negotiationStages) {
      expect(stage.anonymousProfileSetId).toBe(NEGOTIATION_PROFILE_SET_ID);
    }
  });

  it('does NOT tag unrelated stages', () => {
    const otherStages = stages.filter((s) => !isNegotiationStage(s));
    for (const stage of otherStages) {
      expect(stage.anonymousProfileSetId).toBeUndefined();
    }
  });

  it('produces stage configs that all pass strict schema validation', () => {
    // This is the guard that experiment creation from the template will not be
    // rejected by validation once the stages carry anonymousProfileSetId.
    for (const stage of stages) {
      // Capture identity before Value.Check, whose type guard would otherwise
      // narrow `stage` to `never` in the failure branch below.
      const {name, kind} = stage;
      const entry = CONFIG_DATA[kind];
      if (!entry) continue; // stage kind has no config-data schema
      const valid = Value.Check(entry.schema, stage);
      if (!valid) {
        const errors = [...Value.Errors(entry.schema, stage)].map(
          (e) => `${e.path}: ${e.message}`,
        );
        throw new Error(
          `Stage "${name}" (${kind}) failed validation:\n${errors.join('\n')}`,
        );
      }
      expect(valid).toBe(true);
    }
  });
});
