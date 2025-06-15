import {
  ParticipantProfile,
  getNameFromPublicId,
  sortParticipantsByRandomProfile,
} from '../participant';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {
  ChipItem,
  ChipStageConfig,
  ChipStagePublicData,
  ChipTransaction,
  ChipTransactionStatus,
  SimpleChipLog,
  createSimpleChipLog,
} from './chip_stage';

// ****************************************************************************
// Helper functions related to ChipStage.
// ****************************************************************************

export function displayChipOfferText(
  offerChipMap: Record<string, number>,
  chipItems: ChipItem[],
): string {
  const chipDescriptions: string[] = [];

  chipItems.forEach((chip) => {
    const quantity = offerChipMap[chip.id];
    if (quantity) {
      chipDescriptions.push(
        `${chip.avatar} ${quantity} ${chip.name} chip${quantity !== 1 ? 's' : ''}`,
      );
    }
  });

  if (chipDescriptions.length > 2) {
    const lastDescription = chipDescriptions.pop();
    return `${chipDescriptions.join(', ')}, and ${lastDescription}`;
  }

  return chipDescriptions.join(' and ');
}

/** Use chip public data to get time-ordered logs. */
export function getChipLogs(
  stage: ChipStageConfig,
  publicData: ChipStagePublicData,
  participants: ParticipantProfile[],
  currentParticipantPublicId = '', // leave blank if not using for logging
): SimpleChipLog[] {
  let logs: SimpleChipLog[] = [];
  const offerMap = publicData.participantOfferMap;

  // Get order of participant turns
  const orderedParticipants = sortParticipantsByRandomProfile(participants);

  // For each round/turn, convert to set of logs
  let round = 0;
  let turn = 0;
  while (offerMap[round]) {
    turn = 0;
    for (const participant of orderedParticipants) {
      const transaction = offerMap[round][participant.publicId];
      // Add new round log if applicable
      if (turn === 0) {
        logs.push(
          createSimpleChipLog(`Round ${round + 1} of ${stage.numRounds}`),
        );
      }

      if (transaction) {
        logs = [
          ...logs,
          ...getChipLogsFromTransaction(
            stage,
            transaction,
            participants,
            currentParticipantPublicId,
          ),
        ];
      }
      turn += 1;
    }
    round += 1;
  }

  // If game is over, no more logs
  if (publicData.isGameOver) {
    return logs;
  }

  // Otherwise, if current round/turn has not made an offer yet, add a turn log
  const currentRound = publicData.currentRound;
  const currentTurn = publicData.currentTurn;
  if (
    currentTurn &&
    (!offerMap[currentRound] || !offerMap[currentRound][currentTurn])
  ) {
    const sender = getNameFromPublicId(participants, currentTurn);
    const name =
      currentParticipantPublicId === currentTurn
        ? `Your turn (${sender})`
        : `${sender}'s turn`;
    // TODO: Store timestamp for when turn begins
    logs.push(createSimpleChipLog(`${name} to submit an offer!`));
  }

  return logs;
}

/** Convert single transaction into series of logs. */
export function getChipLogsFromTransaction(
  stage: ChipStageConfig,
  transaction: ChipTransaction,
  participants: ParticipantProfile[],
  currentParticipantPublicId = '',
): SimpleChipLog[] {
  const logs: SimpleChipLog[] = [];

  // Log participant for current turn
  const offer = transaction.offer;
  const sender = getNameFromPublicId(participants, offer.senderId);
  const isSender = currentParticipantPublicId === offer.senderId;
  const name = isSender ? `Your (${sender})` : `${sender}'s`;
  // TODO: Store timestamp for when turn begins
  logs.push(createSimpleChipLog(`${name} turn to submit an offer!`));

  // Log offer
  const offerName = isSender ? `You (${sender}) are` : `${sender} is`;
  logs.push(
    createSimpleChipLog(
      `${offerName} offering ${displayChipOfferText(offer.sell, stage.chips)} chips to get ${displayChipOfferText(offer.buy, stage.chips)} in return.`,
      offer.timestamp,
    ),
  );

  // If applicable, write log of current participant's response
  const hasResponse = transaction.responseMap[currentParticipantPublicId];
  if (!isSender && hasResponse) {
    const response = hasResponse.response ? 'accepted' : 'rejected';
    logs.push(
      createSimpleChipLog(`You ${response} the offer`, hasResponse.timestamp),
    );
  }

  // If pending, write status log
  if (transaction.status === ChipTransactionStatus.PENDING) {
    if (isSender) {
      logs.push(
        createSimpleChipLog(
          `Waiting for other participants to respond to your offer...`,
        ),
      );
    } else if (hasResponse) {
      logs.push(
        createSimpleChipLog(
          `Waiting for other participants to respond to ${sender}'s offer...'`,
        ),
      );
    } else {
      logs.push(
        createSimpleChipLog(
          `‼️ Please evaluate and respond to ${sender}'s offer!`,
        ),
      );
    }
    return logs;
  }

  // Otherwise, add accept/reject log
  const recipientId = transaction.recipientId;
  const lowercaseName = name.charAt(0).toLowerCase() + name.slice(1);
  if (transaction.status === ChipTransactionStatus.ACCEPTED && recipientId) {
    const recipient = getNameFromPublicId(participants, recipientId);
    logs.push(
      createSimpleChipLog(
        `🤝 Deal made: ${name} offer was accepted by ${recipient}.`,
        offer.timestamp, // TODO: Get timestamp for when transaction ended
      ),
    );
  } else if (recipientId) {
    logs.push(
      createSimpleChipLog(
        `❌ No deal: There was an error processing ${lowercaseName} offer.`,
        offer.timestamp, // TODO: Get timestamp for when transaction ended
      ),
    );
  } else {
    logs.push(
      createSimpleChipLog(
        `❌ No deal: No one accepted ${lowercaseName} offer.`,
        offer.timestamp, // TODO: Get timetsamp for when transaction ended
      ),
    );
  }

  return logs;
}

/** Check if chip offer can be accepted by other participants. */
export function isChipOfferAcceptable(
  buyChipType: string, // type of chip to buy
  buyChipQuantity: number, // number of chips to buy
  publicData: ChipStagePublicData,
  currentParticipantPublicId: string,
) {
  const chipMap = publicData.participantChipMap;
  const participants = Object.keys(chipMap);
  for (const participant of participants) {
    if (participant !== currentParticipantPublicId) {
      const participantChipMap = chipMap[participant];
      if (participantChipMap[buyChipType] >= buyChipQuantity) {
        return true;
      }
    }
  }
  return false;
}

/** Calculate chip payout for a certain offer. */
export function calculateChipOfferPayout(
  chipMap: Record<string, number>,
  chipValueMap: Record<string, number>,
  addChipMap: Record<string, number> = {},
  removeChipMap: Record<string, number> = {},
) {
  // Calculate the total payout before the offer
  const currentTotalPayout = Object.keys(chipMap)
    .map((chipId) => {
      const quantity = chipMap[chipId] ?? 0;
      const value = chipValueMap[chipId] ?? 0;
      return quantity * value;
    })
    .reduce((total, value) => total + value, 0);

  // Calculate the changes from the offer
  const addAmount = Object.keys(addChipMap)
    .map((chipId) => {
      return (addChipMap[chipId] ?? 0) * (chipValueMap[chipId] ?? 0);
    })
    .reduce((total, value) => total + value, 0);

  const removeAmount = Object.keys(removeChipMap)
    .map((chipId) => {
      return (removeChipMap[chipId] ?? 0) * (chipValueMap[chipId] ?? 0);
    })
    .reduce((total, value) => total + value, 0);

  // Update the hypothetical payout
  return {
    before: currentTotalPayout,
    after: currentTotalPayout + addAmount - removeAmount,
  };
}
