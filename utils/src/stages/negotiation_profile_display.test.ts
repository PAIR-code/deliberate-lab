import {Value} from '@sinclair/typebox/value';
import {
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  getActiveProfileSetId,
} from '../profile_sets';
import {NEGOTIATION_PROFILE_SET_ID} from './negotiation_profile_stage';
import {
  ParticipantProfile,
  createParticipantProfileBase,
  getParticipantStageProfile,
} from '../participant';
import {createChatStage} from './chat_stage';
import {ChatStageConfigData} from './chat_stage.validation';

/** Minimal participant profile with a negotiation anonymous profile set. */
function makeParticipant(): ParticipantProfile {
  return {
    ...createParticipantProfileBase(),
    publicId: 'cat-blue-42',
    privateId: 'priv-1',
    name: 'Real Name',
    avatar: '😺',
    anonymousProfiles: {
      [NEGOTIATION_PROFILE_SET_ID]: {name: 'Party A', avatar: '🔴', repeat: 0},
    },
  } as unknown as ParticipantProfile;
}

describe('getActiveProfileSetId (legacy stage-id detection)', () => {
  it('still recognises the built-in secondary/tertiary sets', () => {
    expect(getActiveProfileSetId(`stage-${SECONDARY_PROFILE_SET_ID}`)).toBe(
      PROFILE_SET_ANIMALS_2_ID,
    );
    expect(getActiveProfileSetId(`stage-${TERTIARY_PROFILE_SET_ID}`)).toBe(
      PROFILE_SET_NATURE_ID,
    );
  });

  it('does NOT match generic words that other experiments may use', () => {
    // The bug the reviewer flagged: an unrelated experiment with a stage named
    // "Final decision" (etc.) must not switch profile sets.
    for (const name of [
      'Final decision',
      'Task 2: Wrap-up',
      'Negotiation debrief',
      'Coalition building',
    ]) {
      expect(getActiveProfileSetId('some-stage-id', name)).toBe('');
    }
  });
});

describe('getParticipantStageProfile', () => {
  const participant = makeParticipant();

  it('uses the explicit profile set when the stage opts in', () => {
    const profile = getParticipantStageProfile(
      participant,
      'any-stage-id',
      'Task 2: Negotiation',
      NEGOTIATION_PROFILE_SET_ID,
    );
    expect(profile.name).toBe('Party A');
    expect(profile.avatar).toBe('🔴');
  });

  it('falls back to base identity when no set is requested', () => {
    const profile = getParticipantStageProfile(
      participant,
      'any-stage-id',
      'Task 2: Negotiation',
    );
    expect(profile.name).toBe('Real Name');
    expect(profile.avatar).toBe('😺');
  });

  it('falls back to base identity if the participant lacks the set', () => {
    const profile = getParticipantStageProfile(
      participant,
      'any-stage-id',
      '',
      'some-other-set',
    );
    expect(profile.name).toBe('Real Name');
  });
});

describe('stage config validation with anonymousProfileSetId', () => {
  it('accepts a stage that opts into an anonymous profile set', () => {
    const stage = createChatStage({
      name: 'Task 2: Negotiation',
      anonymousProfileSetId: NEGOTIATION_PROFILE_SET_ID,
    });
    expect(Value.Check(ChatStageConfigData, stage)).toBe(true);
  });

  it('still accepts a stage without the field (backward compatible)', () => {
    const stage = createChatStage({name: 'Regular chat'});
    expect(Value.Check(ChatStageConfigData, stage)).toBe(true);
  });
});
