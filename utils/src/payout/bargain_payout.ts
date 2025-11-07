import {BaseStageParticipantAnswer, StageKind, StagePublicData} from '../stages/stage';
import {
  BargainRole,
  BargainStageParticipantAnswer,
  BargainStagePublicData,
} from '../stages/bargain_stage';

/**
 * Calculate bargain stage payout based on game outcome.
 *
 * @param stageId - ID of the bargain stage
 * @param participantPublicId - Public ID of the participant
 * @param publicDataMap - Map of stage ID to public data
 * @param participantAnswerMap - Map of stage ID to participant answers
 * @returns The calculated payout amount (0 if no deal or invalid data)
 *
 * @example
 * ```typescript
 * const payout = calculateBargainPayout(
 *   'bargain_game',
 *   'participant_123',
 *   publicDataMap,
 *   participantAnswerMap
 * );
 * console.log(`Participant earned: $${payout}`);
 * ```
 */
export function calculateBargainPayout(
  stageId: string,
  participantPublicId: string,
  publicDataMap: Record<string, StagePublicData>,
  participantAnswerMap?: Record<string, BaseStageParticipantAnswer>,
): number {
  console.log('[BARGAIN PAYOUT] Starting calculation', {
    stageId,
    participantPublicId,
    hasPublicDataMap: !!publicDataMap,
    hasAnswerMap: !!participantAnswerMap,
  });

  // Get bargain stage public data
  const publicData = publicDataMap[stageId];
  if (!publicData || publicData.kind !== StageKind.BARGAIN) {
    console.log('[BARGAIN PAYOUT] No valid public data found');
    return 0;
  }

  const bargainPublicData = publicData as BargainStagePublicData;

  // If no deal was reached, payout is 0
  if (bargainPublicData.agreedPrice === null) {
    console.log('[BARGAIN PAYOUT] No deal reached');
    return 0;
  }

  // Get participant's answer data from participantAnswerMap
  if (!participantAnswerMap) {
    console.log('[BARGAIN PAYOUT] No answer map provided');
    return 0;
  }

  const participantAnswer = participantAnswerMap[stageId] as
    | BargainStageParticipantAnswer
    | undefined;
  if (!participantAnswer || participantAnswer.kind !== StageKind.BARGAIN) {
    console.log('[BARGAIN PAYOUT] No valid participant answer found');
    return 0;
  }

  // Get participant's role from public data
  const role = bargainPublicData.participantRoles[participantPublicId];
  console.log('[BARGAIN PAYOUT] Participant roles', {
    participantRoles: bargainPublicData.participantRoles,
    participantPublicId,
    role,
  });

  if (!role) {
    console.log('[BARGAIN PAYOUT] No role found for participant');
    return 0;
  }

  const agreedPrice = bargainPublicData.agreedPrice;
  const valuation = participantAnswer.valuation;

  console.log('[BARGAIN PAYOUT] Calculation data', {
    role,
    agreedPrice,
    valuation,
  });

  // Calculate payout based on role
  if (role === BargainRole.BUYER) {
    // Buyer profit = valuation - price
    const profit = valuation - agreedPrice;
    console.log('[BARGAIN PAYOUT] Buyer profit', {profit});
    return Math.max(0, profit); // Ensure non-negative
  } else {
    // Seller profit = price - valuation
    const profit = agreedPrice - valuation;
    console.log('[BARGAIN PAYOUT] Seller profit', {profit});
    return Math.max(0, profit); // Ensure non-negative
  }
}
