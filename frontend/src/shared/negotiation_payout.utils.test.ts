import {
  calculateNegotiationPayout,
  extractPartySubmission,
} from './negotiation_payout.utils';

describe('calculateNegotiationPayout', () => {
  it('handles valid A+B coalition split within $7.60 limit', () => {
    const subA = {coalition: 'A+B', money: 3.8};
    const subB = {coalition: 'A+B', money: 3.8};
    const subC = {coalition: 'A+C', money: 2.0};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('A+B ($7.60 max)');
    expect(result.payouts['party-a']).toBe(3.8);
    expect(result.payouts['party-b']).toBe(3.8);
    expect(result.payouts['party-c']).toBe(0);
  });

  it('fails A+B coalition when requested sum exceeds $7.60', () => {
    const subA = {coalition: 'A+B', money: 5.0};
    const subB = {coalition: 'A+B', money: 3.0};
    const subC = {coalition: 'Not submitted', money: 0};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.explanation).toContain('exceeded the $7.60 limit');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(0);
  });

  it('handles valid A+C coalition split within $5.50 limit', () => {
    const subA = {coalition: 'A+C', money: 3.0};
    const subB = {coalition: 'A+B', money: 3.0};
    const subC = {coalition: 'A+C', money: 2.5};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('A+C ($5.50 max)');
    expect(result.payouts['party-a']).toBe(3.0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(2.5);
  });

  it('handles valid B+C coalition split within $3.20 limit', () => {
    const subA = {coalition: 'A+B', money: 4.0};
    const subB = {coalition: 'B+C', money: 1.6};
    const subC = {coalition: 'B+C', money: 1.6};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('B+C ($3.20 max)');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(1.6);
    expect(result.payouts['party-c']).toBe(1.6);
  });

  it('handles valid Grand Coalition A+B+C split within $7.80 limit', () => {
    const subA = {coalition: 'A+B+C', money: 2.6};
    const subB = {coalition: 'A+B+C', money: 2.6};
    const subC = {coalition: 'A+B+C', money: 2.6};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('A+B+C ($7.80 max)');
    expect(result.payouts['party-a']).toBe(2.6);
    expect(result.payouts['party-b']).toBe(2.6);
    expect(result.payouts['party-c']).toBe(2.6);
  });

  it('fails when all parties choose different coalitions', () => {
    const subA = {coalition: 'A+B', money: 3.8};
    const subB = {coalition: 'B+C', money: 1.6};
    const subC = {coalition: 'A+C', money: 2.5};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.formedCoalition).toBe('None');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(0);
  });
});

describe('extractPartySubmission', () => {
  it('correctly extracts coalition and money from GUIDE survey answers without scale interference', () => {
    const userAnswers = {
      '5c95a991-483a-418f-90e3-d3a53e2aa06f': {
        id: '5c95a991-483a-418f-90e3-d3a53e2aa06f',
        kind: 'mc',
        choiceId: 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571', // A+B
      },
      '169d8485-bee7-4205-9235-bc3d151df93e': {
        id: '169d8485-bee7-4205-9235-bc3d151df93e',
        kind: 'text',
        answer: '$3.80',
      },
      '151d1901-616a-4f59-8bc6-7ae3e158f7bb': {
        id: '151d1901-616a-4f59-8bc6-7ae3e158f7bb',
        kind: 'scale',
        value: 5, // Trust rating should NOT override money!
      },
    };

    const submission = extractPartySubmission(userAnswers);
    expect(submission.coalition).toBe('A+B');
    expect(submission.money).toBe(3.8);
  });

  it('returns default when user has not submitted', () => {
    const submission = extractPartySubmission(undefined);
    expect(submission.coalition).toBe('Not submitted');
    expect(submission.money).toBe(0);
  });
});
