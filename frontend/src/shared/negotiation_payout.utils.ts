import {SurveyStageConfig} from '@deliberation-lab/utils';

export interface PartySubmission {
  coalition: string; // e.g. 'A+B', 'A+C', 'B+C', 'A+B+C', 'Not submitted', 'Not selected'
  money: number; // e.g. 3.8
}

export interface NegotiationPayoutResult {
  formedCoalition: string; // e.g. 'A+B ($7.60 max)', 'None'
  isSuccess: boolean;
  explanation: string;
  payouts: {
    'party-a': number;
    'party-b': number;
    'party-c': number;
  };
}

export const COALITION_LIMITS: Record<string, number> = {
  'A+B': 7.6,
  'A+C': 5.5,
  'B+C': 3.2,
  'A+B+C': 7.8,
};

/**
 * Calculates the negotiation coalition payout for Parties A, B, and C.
 */
export function calculateNegotiationPayout(
  subA: PartySubmission,
  subB: PartySubmission,
  subC: PartySubmission,
): NegotiationPayoutResult {
  const EPSILON = 0.001;
  const DEFAULT_EXPLANATION =
    'No valid coalition agreement was reached or submitted money demands exceeded the coalition target total.';

  let formedCoalition = 'None';
  let isSuccess = false;
  let explanation = DEFAULT_EXPLANATION;

  let payoutA = 0;
  let payoutB = 0;
  let payoutC = 0;

  if (subA.coalition === 'A+B' && subB.coalition === 'A+B') {
    const sum = subA.money + subB.money;
    if (sum <= 7.6 + EPSILON) {
      formedCoalition = 'A+B ($7.60 max)';
      isSuccess = true;
      payoutA = subA.money;
      payoutB = subB.money;
      explanation = `Party A and Party B successfully formed Coalition A+B. Their requested amounts ($${subA.money.toFixed(
        2,
      )} + $${subB.money.toFixed(2)} = $${sum.toFixed(
        2,
      )}) fit within the $7.60 limit. Party C is excluded and receives $0.00.`;
    } else {
      explanation = `Party A and Party B both selected Coalition A+B, but their total requested amounts ($${subA.money.toFixed(
        2,
      )} + $${subB.money.toFixed(2)} = $${sum.toFixed(
        2,
      )}) exceeded the $7.60 limit by $${(sum - 7.6).toFixed(2)}. Deal failed.`;
    }
  } else if (subA.coalition === 'A+C' && subC.coalition === 'A+C') {
    const sum = subA.money + subC.money;
    if (sum <= 5.5 + EPSILON) {
      formedCoalition = 'A+C ($5.50 max)';
      isSuccess = true;
      payoutA = subA.money;
      payoutC = subC.money;
      explanation = `Party A and Party C successfully formed Coalition A+C. Their requested amounts ($${subA.money.toFixed(
        2,
      )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
        2,
      )}) fit within the $5.50 limit. Party B is excluded and receives $0.00.`;
    } else {
      explanation = `Party A and Party C both selected Coalition A+C, but their total requested amounts ($${subA.money.toFixed(
        2,
      )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
        2,
      )}) exceeded the $5.50 limit by $${(sum - 5.5).toFixed(2)}. Deal failed.`;
    }
  } else if (subB.coalition === 'B+C' && subC.coalition === 'B+C') {
    const sum = subB.money + subC.money;
    if (sum <= 3.2 + EPSILON) {
      formedCoalition = 'B+C ($3.20 max)';
      isSuccess = true;
      payoutB = subB.money;
      payoutC = subC.money;
      explanation = `Party B and Party C successfully formed Coalition B+C. Their requested amounts ($${subB.money.toFixed(
        2,
      )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
        2,
      )}) fit within the $3.20 limit. Party A is excluded and receives $0.00.`;
    } else {
      explanation = `Party B and Party C both selected Coalition B+C, but their total requested amounts ($${subB.money.toFixed(
        2,
      )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
        2,
      )}) exceeded the $3.20 limit by $${(sum - 3.2).toFixed(2)}. Deal failed.`;
    }
  } else if (
    subA.coalition === 'A+B+C' &&
    subB.coalition === 'A+B+C' &&
    subC.coalition === 'A+B+C'
  ) {
    const sum = subA.money + subB.money + subC.money;
    if (sum <= 7.8 + EPSILON) {
      formedCoalition = 'A+B+C ($7.80 max)';
      isSuccess = true;
      payoutA = subA.money;
      payoutB = subB.money;
      payoutC = subC.money;
      explanation = `All three parties successfully formed the Grand Coalition A+B+C. Their requested amounts ($${subA.money.toFixed(
        2,
      )} + $${subB.money.toFixed(2)} + $${subC.money.toFixed(
        2,
      )} = $${sum.toFixed(2)}) fit within the $7.80 limit.`;
    } else {
      explanation = `All three parties selected Coalition A+B+C, but their total requested amounts ($${subA.money.toFixed(
        2,
      )} + $${subB.money.toFixed(2)} + $${subC.money.toFixed(
        2,
      )}) exceeded the $7.80 limit by $${(sum - 7.8).toFixed(2)}. Deal failed.`;
    }
  }

  if (
    explanation === DEFAULT_EXPLANATION &&
    (subA.coalition === 'Not submitted' ||
      subB.coalition === 'Not submitted' ||
      subC.coalition === 'Not submitted')
  ) {
    explanation =
      'Waiting for all participants to complete and submit their final decisions.';
  }

  return {
    formedCoalition,
    isSuccess,
    explanation,
    payouts: {
      'party-a': payoutA,
      'party-b': payoutB,
      'party-c': payoutC,
    },
  };
}

/**
 * Extracts coalition and requested money for a participant from their survey answers.
 */
export function extractPartySubmission(
  userAnswers: Record<string, unknown> | undefined,
  surveyStage?: SurveyStageConfig,
): PartySubmission {
  if (!userAnswers) {
    return {coalition: 'Not submitted', money: 0};
  }

  let coalition = 'Not selected';
  let money = 0;

  // 1. Check known question IDs from GUIDE study
  const coalitionAnswer = userAnswers['5c95a991-483a-418f-90e3-d3a53e2aa06f'];
  if (
    coalitionAnswer &&
    typeof coalitionAnswer === 'object' &&
    'choiceId' in coalitionAnswer
  ) {
    const choiceId = (coalitionAnswer as {choiceId?: string}).choiceId;
    if (choiceId === 'ea5fff0d-7a01-4b81-a383-b7e8dd3f5072')
      coalition = 'A+B+C';
    else if (choiceId === 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571')
      coalition = 'A+B';
    else if (choiceId === '602e3349-4626-4255-ac3a-abebb5f99307')
      coalition = 'A+C';
    else if (choiceId === '22cd5855-3a02-4b38-89ad-80a97a4f7d53')
      coalition = 'B+C';
  }

  const moneyAnswer =
    userAnswers['169d8485-bee7-4205-9235-bc3d151df93e'] ??
    userAnswers['da77c231-efa0-4cf3-91fb-326de91f1d37'];
  if (moneyAnswer && typeof moneyAnswer === 'object') {
    const raw =
      (moneyAnswer as {answer?: string; value?: unknown}).answer ??
      (moneyAnswer as {answer?: string; value?: unknown}).value;
    if (raw !== undefined && raw !== null && raw !== '') {
      const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) money = num;
    }
  }

  // 2. Dynamic matching using survey stage question configurations
  if (surveyStage && surveyStage.questions) {
    for (const q of surveyStage.questions) {
      const ans = userAnswers[q.id];
      if (!ans || typeof ans !== 'object') continue;

      if (
        coalition === 'Not selected' &&
        'options' in q &&
        Array.isArray((q as {options?: unknown[]}).options)
      ) {
        const choiceId = (ans as {choiceId?: string}).choiceId;
        const opt = (
          q as {options: Array<{id: string; text?: string}>}
        ).options.find((o) => o.id === choiceId);
        if (opt && opt.text) {
          const text = opt.text.trim().toUpperCase();
          if (text.includes('A+B+C') || text.includes('ABC'))
            coalition = 'A+B+C';
          else if (text.includes('A+B') || text.includes('AB'))
            coalition = 'A+B';
          else if (text.includes('A+C') || text.includes('AC'))
            coalition = 'A+C';
          else if (text.includes('B+C') || text.includes('BC'))
            coalition = 'B+C';
        }
      }

      if (money === 0 && q.kind === 'text') {
        const qTitle = (q.questionTitle ?? '').toLowerCase();
        if (
          qTitle.includes('share') ||
          qTitle.includes('money') ||
          qTitle.includes('number') ||
          qTitle.includes('split') ||
          qTitle.includes('amount')
        ) {
          const raw =
            (ans as {answer?: string; value?: unknown}).answer ??
            (ans as {answer?: string; value?: unknown}).value;
          if (raw !== undefined && raw !== null && raw !== '') {
            const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) {
              money = num;
            }
          }
        }
      }
    }
  }

  // 3. Fallback: inspect text answers only (never scale answers) for money
  if (money === 0) {
    for (const ansObj of Object.values(userAnswers)) {
      if (!ansObj || typeof ansObj !== 'object') continue;
      if (
        (ansObj as {kind?: string}).kind === 'text' ||
        typeof (ansObj as {answer?: unknown}).answer === 'string'
      ) {
        const raw = (ansObj as {answer?: string}).answer;
        if (raw !== undefined && raw !== null && raw !== '') {
          const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) {
            money = num;
            break;
          }
        }
      }
    }
  }

  // Normalize coalition string
  const norm = coalition.replace(/\s+/g, '').toUpperCase();
  if (norm.includes('A+B+C')) coalition = 'A+B+C';
  else if (norm.includes('A+B')) coalition = 'A+B';
  else if (norm.includes('A+C')) coalition = 'A+C';
  else if (norm.includes('B+C')) coalition = 'B+C';

  return {coalition, money};
}
