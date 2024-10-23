/**
 * Functions for data downloads.
 */

import {
  ChatMessage,
  ChatMessageType,
  ExperimentDownload
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