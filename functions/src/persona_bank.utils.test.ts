import {
  StoredPersona,
  canonicalStringify,
  computeRoundVariableMap,
  personaMatchHash,
  selectPersonaToClaim,
} from './persona_bank.utils';

// An example round: a treatment object paired with a content variable. Any
// external persona generator must hash this identically.
const TREATMENT = {
  treatmentName: 'groupB',
  _isObserver: true,
  _numOtherAgents: 4,
  _swapMediator: '',
  _hasRepresentative: true,
  displayName: 'Group B',
  _skipPrivateChats: false,
  _numInactivePersonas: 0,
};
const TOPIC = {
  topicName: 'Favorite books',
  priorities: [
    'Fiction: Novels and short stories.',
    'Nonfiction: Essays and biographies.',
  ],
};

describe('canonicalStringify', () => {
  it('is independent of object key insertion order', () => {
    expect(canonicalStringify({b: 1, a: 2})).toBe(
      canonicalStringify({a: 2, b: 1}),
    );
  });

  it('preserves array element order', () => {
    expect(canonicalStringify([1, 2, 3])).not.toBe(
      canonicalStringify([3, 2, 1]),
    );
    expect(canonicalStringify([1, 2, 3])).toBe('[1,2,3]');
  });

  it('emits compact, sorted-key JSON', () => {
    expect(canonicalStringify({z: {y: 2, x: 1}, a: [true, null]})).toBe(
      '{"a":[true,null],"z":{"x":1,"y":2}}',
    );
  });
});

describe('personaMatchHash', () => {
  const vars = {treatment: TREATMENT, topic: TOPIC};

  it('is deterministic', () => {
    expect(personaMatchHash(vars)).toBe(personaMatchHash(vars));
  });

  it('is independent of key order within treatment/topic', () => {
    const reordered = {
      topic: {priorities: TOPIC.priorities, topicName: TOPIC.topicName},
      treatment: {
        _numInactivePersonas: 0,
        displayName: 'Group B',
        _hasRepresentative: true,
        treatmentName: 'groupB',
        _swapMediator: '',
        _numOtherAgents: 4,
        _isObserver: true,
        _skipPrivateChats: false,
      },
    };
    expect(personaMatchHash(reordered)).toBe(personaMatchHash(vars));
  });

  it('changes when a priority string changes by one character', () => {
    const tweaked = {
      treatment: TREATMENT,
      topic: {
        topicName: TOPIC.topicName,
        priorities: [TOPIC.priorities[0] + ' ', TOPIC.priorities[1]],
      },
    };
    expect(personaMatchHash(tweaked)).not.toBe(personaMatchHash(vars));
  });

  it('changes when priorities are reordered (array order is significant)', () => {
    const swapped = {
      treatment: TREATMENT,
      topic: {
        topicName: TOPIC.topicName,
        priorities: [TOPIC.priorities[1], TOPIC.priorities[0]],
      },
    };
    expect(personaMatchHash(swapped)).not.toBe(personaMatchHash(vars));
  });

  it('changes when the treatment differs', () => {
    const single = {
      ...vars,
      treatment: {...TREATMENT, treatmentName: 'groupC'},
    };
    expect(personaMatchHash(single)).not.toBe(personaMatchHash(vars));
  });

  // Cross-language anchor: the offline persona generator asserts this exact hex
  // for the same fixture. If it changes, update the generator's self-test too;
  // they must never diverge or generated personas would miss the bank.
  it('matches the documented cross-language anchor', () => {
    expect(personaMatchHash(vars)).toBe(
      'ba04b332f5b23e57a0021c0d4849c3862eccaafeaacf522f92c1e0e18acee1a4',
    );
  });
});

describe('computeRoundVariableMap', () => {
  it('resolves array (permutation) variables at the round index', () => {
    const variableMap = {
      treatment: JSON.stringify([{a: 1}, {a: 2}, {a: 3}]),
      topic: JSON.stringify([{t: 'x'}, {t: 'y'}, {t: 'z'}]),
      plain: 'not-json',
    };
    expect(computeRoundVariableMap(variableMap, 1)).toEqual({
      treatment: {a: 2},
      topic: {t: 'y'},
    });
  });

  it('drops out-of-range indices and undefined maps', () => {
    expect(computeRoundVariableMap(undefined, 0)).toEqual({});
    expect(
      computeRoundVariableMap({treatment: JSON.stringify([{a: 1}])}, 5),
    ).toEqual({});
  });
});

describe('selectPersonaToClaim', () => {
  const persona = (
    id: string,
    usageCount: number,
    usedBy: string[] = [],
  ): StoredPersona =>
    ({
      id,
      hash: 'h',
      variables: {},
      content: id,
      usageCount,
      usedBy,
    }) as unknown as StoredPersona;

  it('returns null when the bank is empty for the hash', () => {
    expect(selectPersonaToClaim([], 'pid')).toBeNull();
  });

  it('prefers the fewest-used persona, tie-broken deterministically by id', () => {
    const bank = [persona('c', 2), persona('a', 0), persona('b', 0)];
    // a and b are both least-used (0); id tie-break picks 'a'.
    expect(selectPersonaToClaim(bank, 'pid')?.id).toBe('a');
  });

  it('never returns a persona this participant has already used', () => {
    const bank = [persona('a', 0, ['pid']), persona('b', 5)];
    // 'a' is least-used but already used by pid, so 'b' is chosen.
    expect(selectPersonaToClaim(bank, 'pid')?.id).toBe('b');
  });

  it('returns null once this participant has used every candidate', () => {
    const bank = [persona('a', 0, ['pid']), persona('b', 0, ['pid'])];
    expect(selectPersonaToClaim(bank, 'pid')).toBeNull();
    // ...but a different participant can still claim them.
    expect(selectPersonaToClaim(bank, 'other')?.id).toBe('a');
  });

  it('gives a participant distinct personas across successive claims', () => {
    // Simulate four sequential claims for one participant by replaying the
    // usedBy/usageCount mutation the transaction would apply.
    let bank = [
      persona('p0', 0),
      persona('p1', 0),
      persona('p2', 0),
      persona('p3', 0),
    ];
    const claimed: string[] = [];
    for (let i = 0; i < 4; i++) {
      const chosen = selectPersonaToClaim(bank, 'pid');
      expect(chosen).not.toBeNull();
      claimed.push(chosen!.id);
      bank = bank.map((p) =>
        p.id === chosen!.id
          ? {...p, usageCount: p.usageCount + 1, usedBy: [...p.usedBy, 'pid']}
          : p,
      );
    }
    expect(new Set(claimed).size).toBe(4); // all distinct within the participant
  });
});
