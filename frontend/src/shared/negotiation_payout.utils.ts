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
  'A+B': 9,
  'A+C': 7,
  'B+C': 5,
  'A+B+C': 10,
};

/** Stable id of the negotiation "Final Decision" survey in the GUIDE study. */
export const NEGOTIATION_FINAL_DECISION_STAGE_ID =
  'fa00266d-2987-4dc1-8f30-e8febb63939d';

const COALITION_OPTION_TEXTS = ['A+B', 'A+C', 'B+C', 'A+B+C'];

/** True if the survey stage offers the coalition multiple-choice options. */
function hasCoalitionOptions(stage: SurveyStageConfig): boolean {
  return (stage.questions ?? []).some(
    (q) =>
      'options' in q &&
      Array.isArray((q as {options?: unknown[]}).options) &&
      (q as {options: Array<{text?: string}>}).options.some((o) =>
        COALITION_OPTION_TEXTS.includes(o.text?.trim().toUpperCase() ?? ''),
      ),
  );
}

/**
 * Selects the negotiation "Final Decision" survey stage from all survey stages.
 *
 * The stable stage id is the reliable signal: experiments created from the
 * template preserve stage ids (only the experiment id is regenerated), so the
 * negotiation survey keeps this id regardless of how studies are ordered or
 * concatenated. We deliberately do NOT fall back to a name match — a consensus
 * study contributes its own "Task 3: Final Decision" survey, and matching on
 * the name would pick the wrong one when that study is placed first.
 *
 * The only fallback is content-based: a survey offering the coalition options
 * (A+B, A+C, B+C, A+B+C), which cannot be confused with a charity survey. This
 * covers the case where the survey was rebuilt/duplicated in the editor and
 * received a fresh id. If neither matches, we return undefined so the caller
 * can show "not available" rather than silently reading an unrelated survey.
 */
export function findNegotiationFinalDecisionStage(
  surveyStages: SurveyStageConfig[],
): SurveyStageConfig | undefined {
  // 1. Exact stage id (preserved from the template — the reliable signal).
  const byId = surveyStages.find(
    (s) => s.id === NEGOTIATION_FINAL_DECISION_STAGE_ID,
  );
  if (byId) return byId;

  // 2. Fallback: survey offering the coalition options (A+B, A+C, B+C, A+B+C).
  return surveyStages.find(hasCoalitionOptions);
}

/**
 * Calculates the negotiation coalition payout for Parties A, B, and C.
 * When participants submit integer shares, the sum of requested shares must
 * equal the coalition limit exactly (sum === limit) for the agreement to succeed.
 */
export function calculateNegotiationPayout(
  subA: PartySubmission,
  subB: PartySubmission,
  subC: PartySubmission,
): NegotiationPayoutResult {
  const DEFAULT_EXPLANATION =
    'No valid coalition agreement was reached or submitted money demands did not match the coalition total.';

  let formedCoalition = 'None';
  let isSuccess = false;
  let explanation = DEFAULT_EXPLANATION;

  let payoutA = 0;
  let payoutB = 0;
  let payoutC = 0;

  if (subA.coalition === 'A+B' && subB.coalition === 'A+B') {
    const sum = subA.money + subB.money;
    if (sum === 9) {
      formedCoalition = 'A+B ($9 max)';
      isSuccess = true;
      payoutA = subA.money;
      payoutB = subB.money;
      explanation = `Party A and Party B successfully formed Coalition A+B. Their requested amounts ($${subA.money} + $${subB.money} = $${sum}) match the $9 total. Party C is excluded and receives $0.`;
    } else {
      explanation = `Party A and Party B both selected Coalition A+B, but their total requested amounts ($${subA.money} + $${subB.money} = $${sum}) did not equal the required $9 total. Deal failed.`;
    }
  } else if (subA.coalition === 'A+C' && subC.coalition === 'A+C') {
    const sum = subA.money + subC.money;
    if (sum === 7) {
      formedCoalition = 'A+C ($7 max)';
      isSuccess = true;
      payoutA = subA.money;
      payoutC = subC.money;
      explanation = `Party A and Party C successfully formed Coalition A+C. Their requested amounts ($${subA.money} + $${subC.money} = $${sum}) match the $7 total. Party B is excluded and receives $0.`;
    } else {
      explanation = `Party A and Party C both selected Coalition A+C, but their total requested amounts ($${subA.money} + $${subC.money} = $${sum}) did not equal the required $7 total. Deal failed.`;
    }
  } else if (subB.coalition === 'B+C' && subC.coalition === 'B+C') {
    const sum = subB.money + subC.money;
    if (sum === 5) {
      formedCoalition = 'B+C ($5 max)';
      isSuccess = true;
      payoutB = subB.money;
      payoutC = subC.money;
      explanation = `Party B and Party C successfully formed Coalition B+C. Their requested amounts ($${subB.money} + $${subC.money} = $${sum}) match the $5 total. Party A is excluded and receives $0.`;
    } else {
      explanation = `Party B and Party C both selected Coalition B+C, but their total requested amounts ($${subB.money} + $${subC.money} = $${sum}) did not equal the required $5 total. Deal failed.`;
    }
  } else if (
    subA.coalition === 'A+B+C' &&
    subB.coalition === 'A+B+C' &&
    subC.coalition === 'A+B+C'
  ) {
    const sum = subA.money + subB.money + subC.money;
    if (sum === 10) {
      formedCoalition = 'A+B+C ($10 max)';
      isSuccess = true;
      payoutA = subA.money;
      payoutB = subB.money;
      payoutC = subC.money;
      explanation = `All three parties successfully formed the Grand Coalition A+B+C. Their requested amounts ($${subA.money} + $${subB.money} + $${subC.money} = $${sum}) match the $10 total.`;
    } else {
      explanation = `All three parties selected Coalition A+B+C, but their total requested amounts ($${subA.money} + $${subB.money} + $${subC.money} = $${sum}) did not equal the required $10 total. Deal failed.`;
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
    userAnswers['e7e5c73f-625d-40c0-bf9d-757795b79887'] ??
    userAnswers['169d8485-bee7-4205-9235-bc3d151df93e'] ??
    userAnswers['da77c231-efa0-4cf3-91fb-326de91f1d37'];
  if (moneyAnswer && typeof moneyAnswer === 'object') {
    const raw =
      (moneyAnswer as {value?: unknown; answer?: string}).value ??
      (moneyAnswer as {value?: unknown; answer?: string}).answer;
    if (raw !== undefined && raw !== null && raw !== '') {
      const num =
        typeof raw === 'number'
          ? Math.round(raw)
          : parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
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

      if (money === 0 && (q.kind === 'scale' || q.kind === 'text')) {
        const qTitle = (q.questionTitle ?? '').toLowerCase();
        // Do not treat trust rating scale questions as money share answers
        if (
          !qTitle.includes('trust') &&
          (qTitle.includes('share') ||
            qTitle.includes('money') ||
            qTitle.includes('slider') ||
            qTitle.includes('split') ||
            qTitle.includes('amount'))
        ) {
          const raw =
            (ans as {value?: unknown; answer?: string}).value ??
            (ans as {value?: unknown; answer?: string}).answer;
          if (raw !== undefined && raw !== null && raw !== '') {
            const num =
              typeof raw === 'number'
                ? Math.round(raw)
                : parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
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
          const num = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
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
