import {STAGE_KIND_REQUIRES_TRANSFER_MIGRATION} from '@deliberation-lab/utils';
import {
  TRANSFER_MIGRATION_HANDLERS,
  applyHoistedTreatment,
} from './participant.utils';
import {
  treatmentAtIndexSkipsPrivateChats,
  treatmentSkipsPrivateChats,
} from './treatment.utils';

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

describe('treatmentSkipsPrivateChats', () => {
  // Array form (expandListToSeparateVariables: false): a single `treatment`
  // variable holding the list of condition objects.
  const arrayTreatment = (order: Array<'skip' | 'keep'>) => ({
    treatment: JSON.stringify(
      order.map((kind, i) => ({
        treatmentName: `cond${i}`,
        _skipPrivateChats: kind === 'skip',
      })),
    ),
  });

  it('returns true when any treatment condition sets _skipPrivateChats', () => {
    expect(
      treatmentSkipsPrivateChats(arrayTreatment(['keep', 'skip', 'keep'])),
    ).toBe(true);
    expect(treatmentSkipsPrivateChats(arrayTreatment(['skip']))).toBe(true);
  });

  it('supports the expanded name_N form (treatment_1, treatment_2, ...)', () => {
    const vm = {
      treatment_1: JSON.stringify({
        treatmentName: 'a',
        _skipPrivateChats: false,
      }),
      treatment_2: JSON.stringify({
        treatmentName: 'b',
        _skipPrivateChats: true,
      }),
    };
    expect(treatmentSkipsPrivateChats(vm)).toBe(true);
  });

  it('returns false when absent, missing, false, or non-JSON', () => {
    expect(treatmentSkipsPrivateChats(undefined)).toBe(false);
    expect(treatmentSkipsPrivateChats({})).toBe(false);
    expect(treatmentSkipsPrivateChats({treatment: 'not json'})).toBe(false);
    expect(treatmentSkipsPrivateChats(arrayTreatment(['keep']))).toBe(false);
  });
});

describe('treatmentAtIndexSkipsPrivateChats', () => {
  const arrayTreatment = (order: Array<'skip' | 'keep'>) => ({
    treatment: JSON.stringify(
      order.map((kind, i) => ({
        treatmentName: `cond${i}`,
        _skipPrivateChats: kind === 'skip',
      })),
    ),
  });

  it('reports only the flag of the requested round (within-subjects)', () => {
    const vm = arrayTreatment(['skip', 'keep', 'skip']);
    expect(treatmentAtIndexSkipsPrivateChats(vm, 0)).toBe(true);
    // Each round's skip flag is independent: one round's skip must not skip
    // another round's private chat.
    expect(treatmentAtIndexSkipsPrivateChats(vm, 1)).toBe(false);
    expect(treatmentAtIndexSkipsPrivateChats(vm, 2)).toBe(true);
  });

  it('supports the expanded name_N form per round', () => {
    const vm = {
      treatment_1: JSON.stringify({
        treatmentName: 'a',
        _skipPrivateChats: true,
      }),
      treatment_2: JSON.stringify({
        treatmentName: 'b',
        _skipPrivateChats: false,
      }),
    };
    expect(treatmentAtIndexSkipsPrivateChats(vm, 0)).toBe(true); // treatment_1
    expect(treatmentAtIndexSkipsPrivateChats(vm, 1)).toBe(false); // treatment_2
  });

  it('returns false when absent, missing, or out of range', () => {
    expect(treatmentAtIndexSkipsPrivateChats(undefined, 0)).toBe(false);
    expect(treatmentAtIndexSkipsPrivateChats({}, 0)).toBe(false);
    expect(treatmentAtIndexSkipsPrivateChats(arrayTreatment(['skip']), 5)).toBe(
      false,
    );
  });
});

describe('applyHoistedTreatment', () => {
  it('resets omitted hoist fields across rounds (within-subjects rotation)', () => {
    const variableMap = {
      treatment: JSON.stringify([
        {_isObserver: true, _swapMediator: 'mediatorB', _numOtherAgents: 4},
        {_numOtherAgents: 0}, // round 1 omits _isObserver and _swapMediator
      ]),
    };
    const target: Record<string, unknown> = {};

    applyHoistedTreatment(target, variableMap, 0);
    expect(target.isObserver).toBe(true);
    expect(target.swapMediator).toBe('mediatorB');

    // Re-hoist round 1 on the SAME target (simulates a transfer re-hoist).
    applyHoistedTreatment(target, variableMap, 1);
    // Omitted keys must reset to "off", not leak round 0's values.
    expect(target.isObserver).toBe(false);
    expect(target.swapMediator).toBe('');
    expect(
      (target.otherAgentGeneration as {numOtherAgents: number}).numOtherAgents,
    ).toBe(0);
  });

  it('leaves fields untouched when the variable scheme has no treatment keys', () => {
    const target: Record<string, unknown> = {
      isObserver: true,
      swapMediator: 'manual',
    };
    applyHoistedTreatment(
      target,
      {topic: JSON.stringify([{topicName: 'T'}])},
      0,
    );
    expect(target.isObserver).toBe(true);
    expect(target.swapMediator).toBe('manual');
  });
});
