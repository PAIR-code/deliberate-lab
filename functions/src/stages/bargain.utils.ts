import {
  BargainOffer,
  BargainOfferResponse,
  BargainRole,
  BargainStageConfig,
  BargainStageParticipantAnswer,
  BargainStagePublicData,
  BargainTransaction,
  BargainTransactionStatus,
  ParticipantProfile,
  ParticipantProfileExtended,
  StageKind,
  createBargainDealLogEntry,
  createBargainNoDealLogEntry,
  createBargainOfferLogEntry,
  createBargainResponseLogEntry,
  createBargainStartLogEntry,
} from '@deliberation-lab/utils';
import {Timestamp, Transaction} from 'firebase-admin/firestore';
import {app} from '../app';

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
  console.log('[BARGAIN] initializeBargainStage starting', {
    experimentId,
    cohortId,
    stageId: stageConfig.id,
    participantCount: participants.length,
  });

  // Get public data to check if already initialized
  const publicDataDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageConfig.id);

  const publicDataSnapshot = await transaction.get(publicDataDoc);
  const publicData = publicDataSnapshot.data() as
    | BargainStagePublicData
    | undefined;

  console.log('[BARGAIN] Check initialization status:', {
    exists: !!publicData,
    hasRoles: publicData?.participantRoles && Object.keys(publicData.participantRoles).length > 0,
    currentTurn: publicData?.currentTurn,
  });

  // If already initialized (roles assigned), don't reinitialize
  if (publicData?.participantRoles && Object.keys(publicData.participantRoles).length > 0) {
    console.log('[BARGAIN] Already initialized with roles, aborting');
    return;
  }

  // Need at least 2 participants to initialize
  if (participants.length < 2) {
    console.log('[BARGAIN] Not enough participants yet:', participants.length);
    return;
  }

  // Use first 2 participants for the game
  const gameParticipants = participants.slice(0, 2);
  console.log('[BARGAIN] Initializing game with participants:', {
    participant1: gameParticipants[0].publicId,
    participant2: gameParticipants[1].publicId,
  });

  // Validate configuration values
  console.log(`[BARGAIN] Config validation - Buyer range: [${stageConfig.buyerValuationMin}, ${stageConfig.buyerValuationMax}], Seller range: [${stageConfig.sellerValuationMin}, ${stageConfig.sellerValuationMax}]`);

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

  console.log(
    `[BARGAIN] Generated valuations - Buyer: ${buyerValuation}, Seller: ${sellerValuation} (iterations: ${iterationCount})`
  );

  // Randomly select who makes the first move
  const firstMover = Math.random() < 0.5 ? buyer : seller;

  // Use config settings for max turns, chat, and info visibility
  const maxTurns = stageConfig.maxTurns;
  const chatEnabled = stageConfig.enableChat;

  // Calculate opponent info messages based on config booleans
  const buyerOpponentInfo = stageConfig.showSellerValuationToBuyer
    ? `Values between $${stageConfig.sellerValuationMin} - $${stageConfig.sellerValuationMax}`
    : 'You have no idea';

  const sellerOpponentInfo = stageConfig.showBuyerValuationToSeller
    ? `Values between $${stageConfig.buyerValuationMin} - $${stageConfig.buyerValuationMax}`
    : 'You have no idea';

  console.log(
    `[BARGAIN] Settings - maxTurns: ${maxTurns}, chatEnabled: ${chatEnabled}, ` +
    `showSellerToBuyer: ${stageConfig.showSellerValuationToBuyer}, showBuyerToSeller: ${stageConfig.showBuyerValuationToSeller}`
  );
  console.log(
    `[BARGAIN] Opponent info - Buyer sees: "${buyerOpponentInfo}", Seller sees: "${sellerOpponentInfo}"`
  );

  // Create participant answers
  const buyerAnswerDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(buyer.privateId)
    .collection('stageData')
    .doc(stageConfig.id);

  const buyerAnswer: BargainStageParticipantAnswer = {
    id: stageConfig.id,
    kind: StageKind.BARGAIN,
    valuation: buyerValuation,
    makeFirstMove: firstMover.publicId === buyer.publicId,
    opponentInfo: buyerOpponentInfo,
  };

  const sellerAnswerDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(seller.privateId)
    .collection('stageData')
    .doc(stageConfig.id);

  const sellerAnswer: BargainStageParticipantAnswer = {
    id: stageConfig.id,
    kind: StageKind.BARGAIN,
    valuation: sellerValuation,
    makeFirstMove: firstMover.publicId === seller.publicId,
    opponentInfo: sellerOpponentInfo,
  };

  // Initialize public data
  const initialPublicData: BargainStagePublicData = {
    id: stageConfig.id,
    kind: StageKind.BARGAIN,
    isGameOver: false,
    currentTurn: 1,
    maxTurns: maxTurns,
    chatEnabled: chatEnabled,
    currentOfferer: firstMover.publicId,
    buyerId: buyer.publicId,
    sellerId: seller.publicId,
    participantRoles: {
      [buyer.publicId]: BargainRole.BUYER,
      [seller.publicId]: BargainRole.SELLER,
    },
    transactions: [],
    agreedPrice: null,
  };

  // Write to Firestore
  console.log('[BARGAIN] Writing initialization data to Firestore', {
    buyerId: buyer.publicId,
    sellerId: seller.publicId,
    buyerValuation,
    sellerValuation,
    firstMoverId: firstMover.publicId,
    buyerInfo: buyerOpponentInfo,
    sellerInfo: sellerOpponentInfo,
    maxTurns: maxTurns,
    chatEnabled: chatEnabled,
  });

  transaction.set(buyerAnswerDoc, buyerAnswer);
  transaction.set(sellerAnswerDoc, sellerAnswer);
  transaction.set(publicDataDoc, initialPublicData);

  // Log the start
  const logDoc = publicDataDoc.collection('logs').doc();
  const logEntry = createBargainStartLogEntry(
    buyer.publicId,
    seller.publicId,
    firstMover.publicId,
    Timestamp.now() as any, // Use firebase-admin Timestamp
  );
  transaction.set(logDoc, logEntry);

  console.log('[BARGAIN] initializeBargainStage completed successfully');
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
  const publicDataDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId);

  const publicDataSnapshot = await transaction.get(publicDataDoc);
  const publicData = publicDataSnapshot.data() as BargainStagePublicData;

  if (!publicData) {
    throw new Error('Public data not found');
  }

  if (publicData.isGameOver) {
    throw new Error('Game is already over');
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

  // Update public data - keep currentOfferer same but they're now waiting for response
  const updatedPublicData: BargainStagePublicData = {
    ...publicData,
    transactions: updatedTransactions,
    // currentOfferer stays the same - they'll get it back if offer is rejected
  };

  transaction.update(publicDataDoc, updatedPublicData as any);

  // Log the offer
  const logDoc = publicDataDoc.collection('logs').doc();
  const logEntry = createBargainOfferLogEntry(offer, Timestamp.now() as any);
  transaction.set(logDoc, logEntry);
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
  const publicDataDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId);

  const stageDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('stages')
    .doc(stageId);

  // Get participant answer to access their maxTurns
  const participantAnswerDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantPrivateId)
    .collection('stageData')
    .doc(stageId);

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

  let updatedPublicData: BargainStagePublicData;

  if (accept) {
    // Deal reached - game over
    updatedPublicData = {
      ...publicData,
      transactions: updatedTransactions,
      isGameOver: true,
      agreedPrice: lastTransaction.offer.price,
    };

    // Log the deal
    const logDoc = publicDataDoc.collection('logs').doc();
    const logEntry = createBargainDealLogEntry(
      lastTransaction.offer.price,
      publicData.currentTurn,
      Timestamp.now() as any,
    );
    transaction.set(logDoc, logEntry);
  } else {
    // Offer rejected - check if we've reached max turns
    const nextTurn = publicData.currentTurn + 1;

    if (nextTurn > participantAnswer.maxTurns) {
      // Max turns reached - no deal
      updatedPublicData = {
        ...publicData,
        transactions: updatedTransactions,
        isGameOver: true,
        currentTurn: nextTurn,
      };

      // Log no deal
      const logDoc = publicDataDoc.collection('logs').doc();
      const logEntry = createBargainNoDealLogEntry(
        participantAnswer.maxTurns,
        Timestamp.now() as any,
      );
      transaction.set(logDoc, logEntry);
    } else {
      // Continue negotiation - respondent (who rejected) becomes the next offerer
      updatedPublicData = {
        ...publicData,
        transactions: updatedTransactions,
        currentTurn: nextTurn,
        currentOfferer: participantPublicId, // Responder becomes next offerer
      };
    }
  }

  transaction.update(publicDataDoc, updatedPublicData as any);

  // Log the response
  const responseLogDoc = publicDataDoc.collection('logs').doc();
  const responseLogEntry = createBargainResponseLogEntry(
    participantPublicId,
    response,
    Timestamp.now() as any,
  );
  transaction.set(responseLogDoc, responseLogEntry);
}

/**
 * Get all participants in a cohort.
 */
export async function getBargainParticipants(
  experimentId: string,
  cohortId: string,
): Promise<ParticipantProfile[]> {
  const participantsSnapshot = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .where('currentCohortId', '==', cohortId)
    .get();

  return participantsSnapshot.docs.map((doc) => doc.data() as ParticipantProfile);
}

/**
 * Check if bargain stage should be initialized (when both participants reach the stage).
 * Called from participant trigger when a participant's stage changes.
 */
export async function checkAndInitializeBargainStage(
  experimentId: string,
  stageConfig: BargainStageConfig,
  participant: ParticipantProfile,
) {
  console.log('[BARGAIN] checkAndInitializeBargainStage called', {
    experimentId,
    stageId: stageConfig.id,
    participantId: participant.publicId,
    currentStageId: participant.currentStageId,
  });

  // Only initialize if this participant just reached the bargain stage
  if (participant.currentStageId !== stageConfig.id) {
    console.log('[BARGAIN] Participant not at bargain stage, skipping');
    return;
  }

  const cohortId = participant.currentCohortId;
  console.log('[BARGAIN] Checking participants in cohort', {cohortId});

  try {
    // Get all participants in this cohort who are at this stage
    const participantsSnapshot = await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .where('currentCohortId', '==', cohortId)
      .where('currentStageId', '==', stageConfig.id)
      .get();

    const participantsAtStage = participantsSnapshot.docs.map(
      (doc) => doc.data() as ParticipantProfileExtended,
    );

    console.log('[BARGAIN] Participants at stage count:', {
      count: participantsAtStage.length,
      participantIds: participantsAtStage.map((p) => p.publicId),
    });

    // Only initialize when exactly 2 participants are at the stage
    if (participantsAtStage.length === 2) {
      console.log('[BARGAIN] 2 participants ready, attempting initialization');

      await app.firestore().runTransaction(async (transaction) => {
        // Double-check public data hasn't been initialized yet
        const publicDataDoc = app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('cohorts')
          .doc(cohortId)
          .collection('publicStageData')
          .doc(stageConfig.id);

        const publicDataSnapshot = await transaction.get(publicDataDoc);
        const publicData = publicDataSnapshot.data() as
          | BargainStagePublicData
          | undefined;

        console.log('[BARGAIN] Public data check:', {
          exists: !!publicData,
          currentTurn: publicData?.currentTurn,
          isGameOver: publicData?.isGameOver,
        });

        // Only initialize if currentTurn is 0 (not yet started)
        if (!publicData || publicData.currentTurn === 0) {
          console.log('[BARGAIN] Initializing bargain stage');
          await initializeBargainStage(
            transaction,
            experimentId,
            cohortId,
            stageConfig,
            participantsAtStage,
          );
          console.log('[BARGAIN] Initialization complete');
        } else {
          console.log('[BARGAIN] Already initialized, skipping (currentTurn > 0)');
        }
      });

      console.log('[BARGAIN] Transaction completed successfully');
    } else if (participantsAtStage.length < 2) {
      console.log('[BARGAIN] Waiting for second participant');
    } else {
      console.log('[BARGAIN] WARNING: More than 2 participants at stage:', participantsAtStage.length);
    }
  } catch (error) {
    console.error('[BARGAIN] Error in checkAndInitializeBargainStage:', error);
    throw error;
  }
}
