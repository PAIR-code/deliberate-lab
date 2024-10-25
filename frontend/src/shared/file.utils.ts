/**
 * Functions for data downloads.
 */

import {
  ChatMessage,
  ChatMessageType,
  ExperimentDownload,
  ParticipantDownload,
  ParticipantProfileExtended,
  PayoutItemType,
  PayoutStageConfig,
  RankingStageConfig,
  RankingStagePublicData,
  StageKind,
  SurveyAnswer,
  SurveyStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  calculatePayoutResult,
  calculatePayoutTotal
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from './utils';

// ****************************************************************************
// FILE DOWNLOAD FUNCTIONS
// ****************************************************************************

/** Download blob (helper function for file downloads) */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click(); // Trigger the download

  // Clean up the URL and remove the link after the download
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Download data as a CSV */
export function downloadCSV(data: string[][], filename: string) {
  const csvData = data.map((line: string[]) => line.map(
    line => JSON.stringify(line))
    .join(',')).join('\n');

  const blob = new Blob([csvData], { type: 'application/csv' });
  downloadBlob(blob, `${filename}.csv`);
}

/** Download data as a JSON file */
export function downloadJSON(data: object, filename: string) {
  const jsonData = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonData], { type: 'application/json' });
  downloadBlob(blob, filename);
}

// ****************************************************************************
// CSV DATA TYPES
// ****************************************************************************

/** CSV chat history data. */
export interface ChatHistoryData {
  experimentName: string;
  cohortId: string;
  stageId: string;
  data: string[][];
}

// ****************************************************************************
// CSV DATA FUNCTIONS
// ****************************************************************************

/** Returns CSV data for all participants in experiment download. */
export function getParticipantData(
  data: ExperimentDownload
) {
  const participantData: string[][] = [];

  // Add headings
  participantData.push(getAllParticipantCSVColumns(data));

  // Add participants
  for (const participant of Object.values(data.participantMap)) {
    participantData.push(getAllParticipantCSVColumns(data, participant));
  }
  return participantData;
}

/** Returns CSV data for all chat histories in experiment download. */
export function getChatHistoryData(
  data: ExperimentDownload
): ChatHistoryData[] {
  const chatData: ChatHistoryData[] = [];
  for (const cohortId of Object.keys(data.cohortMap)) {
    const cohort = data.cohortMap[cohortId];
    for (const stageId of Object.keys(cohort.chatMap)) {
      const chat = cohort.chatMap[stageId];
      const chatHistory: string[][] = [];
      // Add headings
      chatHistory.push(getChatMessageCSVColumns());
      // Add chat messages
      for (const message of chat) {
        chatHistory.push(getChatMessageCSVColumns(message));
      }
      chatData.push({
        experimentName: data.experiment.metadata.name,
        cohortId,
        stageId,
        data: chatHistory
      });
    }
  }
  return chatData;
}

/** Returns all CSV columns for given participant (or headings if null). */
export function getAllParticipantCSVColumns(
  data: ExperimentDownload,
  participant: ParticipantDownload|null = null
) {
  let participantColumns = getParticipantProfileCSVColumns(
    participant?.profile ?? null
  );

  // For each answer stage, add columns
  data.experiment.stageIds.forEach((stageId) => {
    const stageConfig = data.stageMap[stageId];
    if (!stageConfig) return;

    switch (stageConfig.kind) {
      case StageKind.SURVEY:
        const surveyColumns = getSurveyStageCSVColumns(
          stageConfig, participant
        );
        participantColumns = [...participantColumns, ...surveyColumns];
        break;
      case StageKind.RANKING:
        const rankingColumns = getRankingStageCSVColumns(
          stageConfig, data, participant
        );
        participantColumns = [...participantColumns, ...rankingColumns];
        break;
      case StageKind.PAYOUT:
        const payoutColumns = getPayoutStageCSVColumns(
          stageConfig, data, participant
        );
        participantColumns = [...participantColumns, ...payoutColumns];
        break;
      default:
        break;
    }
  });
  return participantColumns;
}

/** Create CSV columns for participant profile. */
export function getParticipantProfileCSVColumns(
  profile: ParticipantProfileExtended|null = null // if null, return headers
): string[] {
  const columns: string[] = [];

  // Private ID
  columns.push(!profile ? 'Private ID' : profile.privateId);

  // Public ID
  columns.push(!profile ? 'Public ID' : profile.publicId);

  // Prolific ID
  columns.push(!profile ? 'Prolific ID' : profile.prolificId ?? '');

  // Current status
  columns.push(!profile ? 'Current status' : profile.currentStatus);

  // Current stage ID
  columns.push(!profile ? 'Current stage ID' : profile.currentStageId);

  // Current cohort ID
  columns.push(!profile ? 'Current cohort ID' : profile.currentCohortId);

  // Transfer cohort ID
  columns.push(!profile ? 'Transfer cohort ID' : profile.transferCohortId ?? '');

  // Start experiment timestamp
  const startTimestamp = profile?.timestamps.startExperiment ?
    convertUnifiedTimestampToDate(profile.timestamps.startExperiment) : '';
  columns.push(!profile ? 'Start experiment timestamp' : startTimestamp);

  // End experiment timestamp
  const endTimestamp = profile?.timestamps.endExperiment ?
    convertUnifiedTimestampToDate(profile.timestamps.endExperiment) : '';
  columns.push(!profile ? 'End experiment timestamp' : endTimestamp);

  // Accepted TOS timestamp
  const tosTimestamp = profile?.timestamps.acceptedTOS ?
    convertUnifiedTimestampToDate(profile.timestamps.acceptedTOS) : '';
  columns.push(!profile ? 'Accepted TOS timestamp' : tosTimestamp);

  // TODO: Add columns for stage and time completed
  // based on given list of stage configs

  return columns;
}

/** Create CSV columns for payout stage. */
export function getPayoutStageCSVColumns(
  payoutStage: PayoutStageConfig,
  data: ExperimentDownload, // used to extract cohort public data
  participant: ParticipantDownload|null = null // if null, return headers
): string[] {
  const columns: string[] = [];

  // Get public data map from relevant cohort
  const cohortId = participant ? participant.profile.currentCohortId : null;
  const publicDataMap = cohortId ? data.cohortMap[cohortId]?.dataMap : {};

  // Get payout results
  const resultConfig = participant ? calculatePayoutResult(
    payoutStage,
    data.stageMap,
    publicDataMap,
    participant.profile
  ) : null;

  payoutStage.payoutItems.forEach((item) => {
    // Skip if payout item is not active
    if (!item.isActive) return;

    const resultItem = resultConfig?.results.find(result => result.id === item.id) ?? null;

    // Column for amount earned if stage completed
    columns.push(!participant ?
      `Payout earned if stage completed - ${name} - Stage ${payoutStage.id}` :
      // Get amount earned from result config
      resultItem?.baseAmountEarned.toString() ?? ''
    );

    if (item.type === PayoutItemType.SURVEY) {
      // Column for ranking stage whose winner is used
      // (or null if using current participant's answers)
      columns.push(!participant ?
        `Ranking stage used for payout- ${name} - Stage ${payoutStage.id}` :
        item.rankingStageId ?? ''
      );

      // For each question in payout stage config that is also
      // in payout item question map, column for amount earned
      const surveyQuestions
        = (data.stageMap[item.stageId] as SurveyStageConfig)?.questions ?? [];
      surveyQuestions.forEach((question) => {
        if (item.questionMap[question.id]) {
          const questionResult = resultItem?.type === PayoutItemType.SURVEY ?
            resultItem.questionResults.find(result => result.question.id === question.id)
            : null;
          columns.push(!participant ?
            `Correct answer payout - ${question.questionTitle} - Stage ${payoutStage.id}` :
            questionResult?.amountEarned.toString() ?? ''
          );
        }
      });
    }
  });

  // Column for payout total
  columns.push(!participant ?
    `Total payout - Stage ${payoutStage.id}` :
    resultConfig ? calculatePayoutTotal(resultConfig).toString() : ''
  );

  return columns;
}

/** Create CSV columns for ranking stage answers. */
export function getRankingStageCSVColumns(
  rankingStage: RankingStageConfig,
  data: ExperimentDownload, // used to extract ranking public data for cohort
  participant: ParticipantDownload|null = null // if null, return headers
): string[] {
  const columns: string[] = [];

  // Extract participant answer for ranking stage
  const stageAnswer = participant ? participant.answerMap[rankingStage.id] : null;

  // Extract winner ID from cohort ranking public data
  const cohortId = participant ? participant.profile.currentCohortId : null;
  const publicData =
    cohortId ? data.cohortMap[cohortId]?.dataMap[rankingStage.id] : null;
  const winnerId = publicData?.kind === StageKind.RANKING ? publicData.winnerId : '';

  // Add column for ranking stage type
  columns.push(
    !participant ? `Ranking type - ${rankingStage.id}` :
    rankingStage.rankingType
  );

  // Add columns for ranking stage strategy
  columns.push(
    !participant ? `Ranking strategy - ${rankingStage.id}` :
    rankingStage.strategy
  );

  // Add column for participant's cohort (since winners are per cohort)
  columns.push(
    !participant ? `Participant's cohort ID` : cohortId ?? ''
  );

  // Add column for ranking winner
  columns.push(
    !participant ? `Ranking winner (for participant's cohort) - ${rankingStage.id}` :
    winnerId
  );

  // Add column for participant's rankings
  columns.push(
    !participant ? `Participant rankings - ${rankingStage.id}` :
    (stageAnswer?.kind === StageKind.RANKING ? stageAnswer.rankingList.join(',') : '')
  );

  return columns;
}

/** Create CSV columns for survey stage answers. */
export function getSurveyStageCSVColumns(
  surveyStage: SurveyStageConfig,
  participant: ParticipantDownload|null = null // if null, return headers
): string[] {
  const columns: string[] = [];

  const stageAnswer = participant ? participant.answerMap[surveyStage.id] : null;
  surveyStage.questions.forEach(question => {
    const answer = stageAnswer?.kind === StageKind.SURVEY ?
      stageAnswer?.answerMap[question.id] : null;

    switch (question.kind) {
      case SurveyQuestionKind.TEXT:
        const textAnswer = answer?.kind === SurveyQuestionKind.TEXT ?
          answer?.answer : '';
        columns.push(!participant ?
          `${question.questionTitle} - Survey ${surveyStage.id}` :
          textAnswer
        );
        break;
      case SurveyQuestionKind.CHECK:
        const checkAnswer = answer?.kind === SurveyQuestionKind.CHECK ?
          answer?.isChecked.toString() : '';
        columns.push(!participant ?
          `${question.questionTitle} - Survey ${surveyStage.id}` :
          checkAnswer
        );
        break;
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        const mcAnswer = answer?.kind === SurveyQuestionKind.MULTIPLE_CHOICE ?
          answer?.choiceId : '';
        // Add columns for every multiple choice option
        question.options.forEach((item, index) => {
          columns.push(!participant ?
            `Option ${index + 1} (${item.id}) - ${question.questionTitle} - Survey ${surveyStage.id}` :
            item.text
          );
        });
        // If correct answer, add column for correct answer
        if (question.correctAnswerId) {
          columns.push(!participant ?
            `Correct answer - ${question.questionTitle} - Survey ${surveyStage.id}` :
            question.options.find(item => item.id === question.correctAnswerId)?.text ?? ''
          );
        }
        // Add column for participant answer ID
        columns.push(!participant ?
          `Participant answer (ID) - ${question.questionTitle} - Survey ${surveyStage.id}` :
          mcAnswer
        );
        // Add column for participant text answer
        columns.push(!participant ?
          `Participant answer (text) - ${question.questionTitle} - Survey ${surveyStage.id}` :
          question.options.find(item => item.id === mcAnswer)?.text ?? ''
        );
        // If correct answer, add column for if answer was correct
        if (question.correctAnswerId) {
          columns.push(!participant ?
            `Is participant correct? - ${question.questionTitle} - Survey ${surveyStage.id}` :
            (mcAnswer === question.correctAnswerId).toString()
          );
        }
        break;
      case SurveyQuestionKind.SCALE:
        const scaleAnswer = answer?.kind === SurveyQuestionKind.SCALE ?
          answer?.value.toString() : '';
        columns.push(!participant ?
          `${question.questionTitle} - Survey ${surveyStage.id}` :
          scaleAnswer
        );
        break;
      default:
        break;
    }
  });

  return columns;
}

/** Create CSV columns for ChatMessage. */
export function getChatMessageCSVColumns(
  message: ChatMessage|null = null // if null, return headers
): string[] {
  const columns: string[] = [];

  // Timestamp
  columns.push(!message ? 'Timestamp' : convertUnifiedTimestampToDate(message.timestamp));

  // ID
  columns.push(!message ? 'Message ID' : message.id);

  // Discussion ID
  columns.push(!message ? 'Discussion ID' : message.discussionId ?? '');

  // Type
  columns.push(!message ? 'Message type' : message.type);

  // Participant public ID (if participant chat message)
  const publicId = message?.type === ChatMessageType.PARTICIPANT ?
    message.participantPublicId : '';
  columns.push(!message ? 'Participant public ID' : publicId);

  // Profile name
  columns.push(!message ? 'Sender name' : message.profile.name ?? '');

  // Profile avatar
  columns.push(!message ? 'Sender avatar' : message.profile.avatar ?? '');

  // Profile pronouns
  columns.push(!message ? 'Sender pronouns' : message.profile.pronouns ?? '');

  // Message content
  columns.push(!message ? 'Message content' : message.message);

  return columns;
}