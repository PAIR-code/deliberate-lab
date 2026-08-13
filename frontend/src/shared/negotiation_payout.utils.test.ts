import {SurveyStageConfig} from '@deliberation-lab/utils';
import {
  NEGOTIATION_FINAL_DECISION_STAGE_ID,
  calculateNegotiationPayout,
  extractPartySubmission,
  findNegotiationFinalDecisionStage,
} from './negotiation_payout.utils';

describe('calculateNegotiationPayout', () => {
  it('handles valid A+B coalition split equaling $9 total exactly', () => {
    const subA = {coalition: 'A+B', money: 5};
    const subB = {coalition: 'A+B', money: 4};
    const subC = {coalition: 'A+C', money: 2};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('A+B ($9 max)');
    expect(result.payouts['party-a']).toBe(5);
    expect(result.payouts['party-b']).toBe(4);
    expect(result.payouts['party-c']).toBe(0);
    expect(result.explanation).toContain('match the $9 total');
  });

  it('fails A+B coalition when requested sum does not equal $9 total (sum < 9)', () => {
    const subA = {coalition: 'A+B', money: 5};
    const subB = {coalition: 'A+B', money: 3};
    const subC = {coalition: 'Not submitted', money: 0};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.explanation).toContain('did not equal the required $9 total');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(0);
  });

  it('fails A+B coalition when requested sum does not equal $9 total (sum > 9)', () => {
    const subA = {coalition: 'A+B', money: 5};
    const subB = {coalition: 'A+B', money: 5};
    const subC = {coalition: 'Not submitted', money: 0};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.explanation).toContain('did not equal the required $9 total');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(0);
  });

  it('handles valid A+C coalition split equaling $7 total exactly', () => {
    const subA = {coalition: 'A+C', money: 4};
    const subB = {coalition: 'A+B', money: 3};
    const subC = {coalition: 'A+C', money: 3};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('A+C ($7 max)');
    expect(result.payouts['party-a']).toBe(4);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(3);
    expect(result.explanation).toContain('match the $7 total');
  });

  it('handles valid B+C coalition split equaling $5 total exactly', () => {
    const subA = {coalition: 'A+B', money: 4};
    const subB = {coalition: 'B+C', money: 3};
    const subC = {coalition: 'B+C', money: 2};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('B+C ($5 max)');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(3);
    expect(result.payouts['party-c']).toBe(2);
    expect(result.explanation).toContain('match the $5 total');
  });

  it('handles valid Grand Coalition A+B+C split equaling $10 total exactly', () => {
    const subA = {coalition: 'A+B+C', money: 4};
    const subB = {coalition: 'A+B+C', money: 3};
    const subC = {coalition: 'A+B+C', money: 3};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.formedCoalition).toBe('A+B+C ($10 max)');
    expect(result.payouts['party-a']).toBe(4);
    expect(result.payouts['party-b']).toBe(3);
    expect(result.payouts['party-c']).toBe(3);
    expect(result.explanation).toContain('match the $10 total');
  });

  it('fails Grand Coalition A+B+C when requested sum does not equal $10', () => {
    const subA = {coalition: 'A+B+C', money: 3};
    const subB = {coalition: 'A+B+C', money: 3};
    const subC = {coalition: 'A+B+C', money: 3};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.explanation).toContain(
      'did not equal the required $10 total',
    );
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(0);
  });

  it('fails when all parties choose different coalitions', () => {
    const subA = {coalition: 'A+B', money: 5};
    const subB = {coalition: 'B+C', money: 3};
    const subC = {coalition: 'A+C', money: 4};

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.formedCoalition).toBe('None');
    expect(result.payouts['party-a']).toBe(0);
    expect(result.payouts['party-b']).toBe(0);
    expect(result.payouts['party-c']).toBe(0);
  });
});

describe('extractPartySubmission', () => {
  it('correctly extracts coalition and integer money from slider scale question in GUIDE study 1', () => {
    const userAnswers = {
      '5c95a991-483a-418f-90e3-d3a53e2aa06f': {
        id: '5c95a991-483a-418f-90e3-d3a53e2aa06f',
        kind: 'mc',
        choiceId: 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571', // A+B
      },
      'e7e5c73f-625d-40c0-bf9d-757795b79887': {
        id: 'e7e5c73f-625d-40c0-bf9d-757795b79887',
        kind: 'scale',
        value: 5,
      },
      '151d1901-616a-4f59-8bc6-7ae3e158f7bb': {
        id: '151d1901-616a-4f59-8bc6-7ae3e158f7bb',
        kind: 'scale',
        value: 4, // Trust rating should NOT override money!
      },
    };

    const submission = extractPartySubmission(userAnswers);
    expect(submission.coalition).toBe('A+B');
    expect(submission.money).toBe(5);
  });

  it('correctly extracts coalition and integer money from legacy text answers without scale interference', () => {
    const userAnswers = {
      '5c95a991-483a-418f-90e3-d3a53e2aa06f': {
        id: '5c95a991-483a-418f-90e3-d3a53e2aa06f',
        kind: 'mc',
        choiceId: 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571', // A+B
      },
      '169d8485-bee7-4205-9235-bc3d151df93e': {
        id: '169d8485-bee7-4205-9235-bc3d151df93e',
        kind: 'text',
        answer: '$5',
      },
      '151d1901-616a-4f59-8bc6-7ae3e158f7bb': {
        id: '151d1901-616a-4f59-8bc6-7ae3e158f7bb',
        kind: 'scale',
        value: 5, // Trust rating should NOT override money!
      },
    };

    const submission = extractPartySubmission(userAnswers);
    expect(submission.coalition).toBe('A+B');
    expect(submission.money).toBe(5);
  });

  it('returns default when user has not submitted', () => {
    const submission = extractPartySubmission(undefined);
    expect(submission.coalition).toBe('Not submitted');
    expect(submission.money).toBe(0);
  });
});

describe('findNegotiationFinalDecisionStage', () => {
  // Minimal stand-ins for the two survey stages that share the "Final Decision"
  // name in a combined experiment. Only fields read by the selector are set.
  const consensusFinalDecision = {
    id: '122bac65-de76-4556-9e30-5dfef2945089',
    kind: 'survey',
    name: '🏠 Task 3: Final Decision',
    questions: [
      {
        id: '92380913-6e2a-4ec4-a0a9-6f49e0fdf29e',
        kind: 'mc',
        questionTitle: 'Which charity did you vote for?',
        options: [
          {id: 'c1', text: 'Charity One'},
          {id: 'c2', text: 'Charity Two'},
          {id: 'c3', text: 'Charity Three'},
        ],
      },
    ],
  } as unknown as SurveyStageConfig;

  const negotiationFinalDecision = {
    id: NEGOTIATION_FINAL_DECISION_STAGE_ID,
    kind: 'survey',
    name: '💰 Task 2: Final Decision',
    questions: [
      {
        id: '5c95a991-483a-418f-90e3-d3a53e2aa06f',
        kind: 'mc',
        questionTitle: 'Which coalition would you like to form?',
        options: [
          {id: 'o1', text: 'A+B+C'},
          {id: 'o2', text: 'A+B'},
          {id: 'o3', text: 'A+C'},
          {id: 'o4', text: 'B+C'},
        ],
      },
    ],
  } as unknown as SurveyStageConfig;

  it('picks the negotiation survey when negotiation comes first', () => {
    const stages = [negotiationFinalDecision, consensusFinalDecision];
    const result = findNegotiationFinalDecisionStage(stages);
    expect(result?.id).toBe(NEGOTIATION_FINAL_DECISION_STAGE_ID);
  });

  it('picks the negotiation survey even when the consensus study comes first', () => {
    // Regression: previously the loose "final decision" name match returned the
    // consensus "Task 3: Final Decision" stage because it appeared first.
    const stages = [consensusFinalDecision, negotiationFinalDecision];
    const result = findNegotiationFinalDecisionStage(stages);
    expect(result?.id).toBe(NEGOTIATION_FINAL_DECISION_STAGE_ID);
  });

  it('falls back to coalition options when the id differs', () => {
    const renamedNegotiation = {
      ...negotiationFinalDecision,
      id: 'some-other-id',
      name: '💰 Task 2: Coalition Choice',
    } as unknown as SurveyStageConfig;
    const stages = [consensusFinalDecision, renamedNegotiation];
    const result = findNegotiationFinalDecisionStage(stages);
    expect(result?.id).toBe('some-other-id');
  });

  it('never picks the consensus survey (returns undefined when no negotiation survey exists)', () => {
    const stages = [consensusFinalDecision];
    const result = findNegotiationFinalDecisionStage(stages);
    // The consensus "Final Decision" survey must not be mistaken for the
    // negotiation one, even when it is the only survey present.
    expect(result).toBeUndefined();
  });
});

describe('negotiation payout end-to-end with consensus study ordering', () => {
  // Hard-coded participant answers for the negotiation "Final Decision" survey.
  const negotiationAnswers = (choiceId: string, money: string) => ({
    '5c95a991-483a-418f-90e3-d3a53e2aa06f': {
      id: '5c95a991-483a-418f-90e3-d3a53e2aa06f',
      kind: 'mc',
      choiceId,
    },
    '169d8485-bee7-4205-9235-bc3d151df93e': {
      id: '169d8485-bee7-4205-9235-bc3d151df93e',
      kind: 'text',
      answer: money,
    },
  });

  // Charity "Final Decision" answers contain no coalition/money data.
  const consensusAnswers = {
    '92380913-6e2a-4ec4-a0a9-6f49e0fdf29e': {
      id: '92380913-6e2a-4ec4-a0a9-6f49e0fdf29e',
      kind: 'mc',
      choiceId: 'c2',
    },
  };

  it('computes the correct payout from the negotiation survey answers', () => {
    // A+B choiceId = b0cab089..., B side selects A+B too with integer shares 5 + 4 = 9.
    const subA = extractPartySubmission(
      negotiationAnswers('b0cab089-b7b7-4827-a9a4-ebc1dfcc7571', '$5'),
    );
    const subB = extractPartySubmission(
      negotiationAnswers('b0cab089-b7b7-4827-a9a4-ebc1dfcc7571', '$4'),
    );
    const subC = extractPartySubmission(consensusAnswers);

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(true);
    expect(result.payouts['party-a']).toBe(5);
    expect(result.payouts['party-b']).toBe(4);
  });

  it('demonstrates the failure when consensus answers are read instead', () => {
    // This is what happened when the wrong (consensus) survey was selected:
    // no coalition/money is extractable, so every party comes back empty and
    // the payout fails.
    const subA = extractPartySubmission(consensusAnswers);
    const subB = extractPartySubmission(consensusAnswers);
    const subC = extractPartySubmission(consensusAnswers);

    const result = calculateNegotiationPayout(subA, subB, subC);
    expect(result.isSuccess).toBe(false);
    expect(result.formedCoalition).toBe('None');
  });
});
