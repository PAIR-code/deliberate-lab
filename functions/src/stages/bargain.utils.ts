import {
  BargainOffer,
  BargainOfferResponse,
  BargainRole,
  BargainStageConfig,
  BargainStageParticipantAnswer,
  BargainStagePublicData,
  BargainTransaction,
  BargainTransactionStatus,
  ParticipantProfileExtended,
  createBargainDealLogEntry,
  createBargainNoDealLogEntry,
  createBargainOfferLogEntry,
  createBargainResponseLogEntry,
  createBargainStartLogEntry,
} from '@deliberation-lab/utils';
import {Timestamp, Transaction} from 'firebase-admin/firestore';
import {
  getFirestoreStagePublicDataRef,
  getFirestoreStageRef,
  getFirestoreParticipantAnswerRef,
} from '../utils/firestore';

/**
 * Initialize bargain stage for a cohort when both participants are ready.
 * Assigns roles, valuations, and sets up the first turn.
 */
export async function initializeBargainStage(
  transaction: Transaction,
  experimentId: string,
  cohortId: string,
  stageConfig: BargainStageConfig,
  participants: ParticipantProfileExtended[],
) {
  // Use first 2 participants for the game
  const gameParticipants = participants.slice(0, 2);

  const publicDataDoc = getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageConfig.id,
  );

  if (
    stageConfig.buyerValuationMin < 6 ||
    stageConfig.buyerValuationMax > 12 ||
    stageConfig.sellerValuationMin < 6 ||
    stageConfig.sellerValuationMax > 12
  ) {
    throw new Error(
      `[BARGAIN] Invalid valuation configuration. All values must be in range [6, 12]. ` +
      `Got buyer: [${stageConfig.buyerValuationMin}, ${stageConfig.buyerValuationMax}], ` +
      `seller: [${stageConfig.sellerValuationMin}, ${stageConfig.sellerValuationMax}]`
    );
  }

  // Randomly assign roles to the first 2 participants
  const shuffled = [...gameParticipants].sort(() => Math.random() - 0.5);
  const buyer = shuffled[0];
  const seller = shuffled[1];

  // Generate valuations ensuring buyer valuation >= seller valuation
  let sellerValuation: number;
  let buyerValuation: number;
  let iterationCount = 0;
  const MAX_ITERATIONS = 100;

  do {
    iterationCount++;
    if (iterationCount > MAX_ITERATIONS) {
      throw new Error(
        `[BARGAIN] Failed to generate valid valuations after ${MAX_ITERATIONS} attempts. ` +
        `Config: buyer [${stageConfig.buyerValuationMin}, ${stageConfig.buyerValuationMax}], ` +
        `seller [${stageConfig.sellerValuationMin}, ${stageConfig.sellerValuationMax}]`
      );
    }

    // Generate seller valuation (lower bound)
    sellerValuation =
      Math.floor(
        Math.random() *
          (stageConfig.sellerValuationMax -
            stageConfig.sellerValuationMin +
            1),
      ) + stageConfig.sellerValuationMin;

    // Generate buyer valuation (upper bound)
    buyerValuation =
      Math.floor(
        Math.random() *
          (stageConfig.buyerValuationMax -
            stageConfig.buyerValuationMin +
            1),
      ) + stageConfig.buyerValuationMin;
  } while (buyerValuation < sellerValuation);

  // Post-generation validation
  if (
    sellerValuation < 6 ||
    sellerValuation > 12 ||
    buyerValuation < 6 ||
    buyerValuation > 12
  ) {
    throw new Error(
      `[BARGAIN] Generated valuations out of valid range [6, 12]. ` +
      `Generated buyer: ${buyerValuation}, seller: ${sellerValuation}`
    );
  }

  // Randomly select who makes the first move
  const firstMover = Math.random() < 0.5 ? buyer : seller;

  // Randomly select max turns from [6, 8, 10, 12] for this cohort
  const maxTurnsOptions = [6, 8, 10, 12];
  const maxTurns = maxTurnsOptions[Math.floor(Math.random() * maxTurnsOptions.length)];

  // Randomly enable/disable chat for this cohort (50% chance)
  const chatEnabled = Math.random() < 0.5;

  // Randomly decide if buyer sees seller info for this cohort (50% chance)
  const showSellerToBuyer = Math.random() < 0.5;
  const buyerOpponentInfo = showSellerToBuyer
    ? `Values between $${stageConfig.sellerValuationMin} - $${stageConfig.sellerValuationMax}`
    : 'You have no idea';

  // Randomly decide if seller sees buyer info for this cohort (50% chance)
  const showBuyerToSeller = Math.random() < 0.5;
  const sellerOpponentInfo = showBuyerToSeller
    ? `Values between $${stageConfig.buyerValuationMin} - $${stageConfig.buyerValuationMax}`
    : 'You have no idea';

  // Get participant answer document references
  const buyerAnswerDoc = getFirestoreParticipantAnswerRef(
    experimentId,
    buyer.privateId,
    stageConfig.id,
  );

  const sellerAnswerDoc = getFirestoreParticipantAnswerRef(
    experimentId,
    seller.privateId,
    stageConfig.id,
  );

  // Update participant answers with game-specific values
  // (placeholder answers created during participant creation)
  transaction.update(buyerAnswerDoc, {
    valuation: buyerValuation,
    opponentInfo: buyerOpponentInfo,
  });
  transaction.update(sellerAnswerDoc, {
    valuation: sellerValuation,
    opponentInfo: sellerOpponentInfo,
  });

  // Create start log entry
  const startLogEntry = createBargainStartLogEntry(
    buyer.publicId,
    seller.publicId,
    firstMover.publicId,
    Timestamp.now() as any, // Use firebase-admin Timestamp
  );

  // Update public data (already exists from cohort creation, so we use update())
  // This ensures we don't overwrite fields like readyParticipants
  transaction.update(publicDataDoc, {
    isGameOver: false,
    currentTurn: 1,
    maxTurns: maxTurns,
    chatEnabled: chatEnabled,
    currentOfferer: firstMover.publicId,
    firstMoverId: firstMover.publicId,
    participantRoles: {
      [buyer.publicId]: BargainRole.BUYER,
      [seller.publicId]: BargainRole.SELLER,
    },
    transactions: [],
    agreedPrice: null,
    logs: [startLogEntry],
  });
}

/**
 * Process a bargain offer from a participant.
 */
export async function processBargainOffer(
  transaction: Transaction,
  experimentId: string,
  cohortId: string,
  stageId: string,
  participantPublicId: string,
  price: number,
  message: string,
) {
  const publicDataDoc = getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );

  const publicDataSnapshot = await transaction.get(publicDataDoc);
  const publicData = publicDataSnapshot.data() as BargainStagePublicData;

  if (!publicData) {
    throw new Error('Public data not found');
  }

  if (publicData.isGameOver) {
    throw new Error('Game is already over');
  }

  if (publicData.currentTurn === null) {
    throw new Error('Game has not started yet');
  }

  if (publicData.currentOfferer !== participantPublicId) {
    throw new Error('Not your turn to make an offer');
  }

  // Create the offer
  const offer: BargainOffer = {
    id: `offer_${Date.now()}`,
    turnNumber: publicData.currentTurn,
    senderId: participantPublicId,
    price,
    message,
    timestamp: Timestamp.now() as any, // Use firebase-admin Timestamp
  };

  // Create transaction
  const bargainTransaction: BargainTransaction = {
    offer,
    response: null,
    status: BargainTransactionStatus.PENDING,
  };

  // Add to transactions
  const updatedTransactions = [...publicData.transactions, bargainTransaction];

  // Create offer log entry
  const offerLogEntry = createBargainOfferLogEntry(offer, Timestamp.now() as any);

  // Update public data - keep currentOfferer same but they're now waiting for response
  const updatedPublicData: BargainStagePublicData = {
    ...publicData,
    transactions: updatedTransactions,
    logs: [...publicData.logs, offerLogEntry],
    // currentOfferer stays the same - they'll get it back if offer is rejected
  };

  transaction.update(publicDataDoc, updatedPublicData as any);
}

/**
 * Process a bargain response (accept/reject) from a participant.
 */
export async function processBargainResponse(
  transaction: Transaction,
  experimentId: string,
  cohortId: string,
  stageId: string,
  participantPublicId: string,
  participantPrivateId: string,
  accept: boolean,
  message: string,
) {
  const publicDataDoc = getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );

  const stageDoc = getFirestoreStageRef(experimentId, stageId);

  // Get participant answer to access their maxTurns
  const participantAnswerDoc = getFirestoreParticipantAnswerRef(
    experimentId,
    participantPrivateId,
    stageId,
  );

  const publicDataSnapshot = await transaction.get(publicDataDoc);
  const stageSnapshot = await transaction.get(stageDoc);
  const participantAnswerSnapshot = await transaction.get(participantAnswerDoc);

  const publicData = publicDataSnapshot.data() as BargainStagePublicData;
  const stageConfig = stageSnapshot.data() as BargainStageConfig;
  const participantAnswer =
    participantAnswerSnapshot.data() as BargainStageParticipantAnswer;

  if (!publicData || !stageConfig || !participantAnswer) {
    throw new Error('Public data, stage config, or participant answer not found');
  }

  if (publicData.isGameOver) {
    throw new Error('Game is already over');
  }

  if (publicData.currentTurn === null) {
    throw new Error('Game has not started yet');
  }

  // Get the last transaction (should be pending)
  const lastTransaction =
    publicData.transactions[publicData.transactions.length - 1];
  if (!lastTransaction || lastTransaction.status !== BargainTransactionStatus.PENDING) {
    throw new Error('No pending offer to respond to');
  }

  // Verify responder is not the offerer
  if (lastTransaction.offer.senderId === participantPublicId) {
    throw new Error('Cannot respond to your own offer');
  }

  // Create response
  const response: BargainOfferResponse = {
    response: accept, // true = accept, false = reject
    message,
    timestamp: Timestamp.now() as any, // Use firebase-admin Timestamp
  };

  // Update the transaction
  const updatedTransaction: BargainTransaction = {
    ...lastTransaction,
    response,
    status: accept
      ? BargainTransactionStatus.ACCEPTED
      : BargainTransactionStatus.REJECTED,
  };

  const updatedTransactions = [
    ...publicData.transactions.slice(0, -1),
    updatedTransaction,
  ];

  // Create response log entry (always needed)
  const responseLogEntry = createBargainResponseLogEntry(
    participantPublicId,
    response,
    Timestamp.now() as any,
  );

  let updatedPublicData: BargainStagePublicData;

  if (accept) {
    // Deal reached - game over
    // Create deal log entry
    const dealLogEntry = createBargainDealLogEntry(
      lastTransaction.offer.price,
      publicData.currentTurn,
      Timestamp.now() as any,
    );

    updatedPublicData = {
      ...publicData,
      transactions: updatedTransactions,
      isGameOver: true,
      agreedPrice: lastTransaction.offer.price,
      logs: [...publicData.logs, responseLogEntry, dealLogEntry],
    };
  } else {
    // Offer rejected - check if we've reached max turns
    const nextTurn = publicData.currentTurn + 1;

    if (nextTurn > publicData.maxTurns) {
      // Max turns reached - no deal
      // Create no deal log entry
      const noDealLogEntry = createBargainNoDealLogEntry(
        publicData.maxTurns,
        Timestamp.now() as any,
      );

      updatedPublicData = {
        ...publicData,
        transactions: updatedTransactions,
        isGameOver: true,
        currentTurn: nextTurn,
        logs: [...publicData.logs, responseLogEntry, noDealLogEntry],
      };
    } else {
      // Continue negotiation - respondent (who rejected) becomes the next offerer
      updatedPublicData = {
        ...publicData,
        transactions: updatedTransactions,
        currentTurn: nextTurn,
        currentOfferer: participantPublicId, // Responder becomes next offerer
        logs: [...publicData.logs, responseLogEntry],
      };
    }
  }

  transaction.update(publicDataDoc, updatedPublicData as any);
}
