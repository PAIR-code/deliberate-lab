import {
  ChatKind,
  Experiment,
  PublicChatData,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind,
  VoteForLeaderStagePublicData,
  allVoteScores,
  chooseLeader,
} from '@llm-mediation-experiments/utils';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app } from '../app';

/** Initialize the public stage data for a stage config when it is created */
export const initializePublicStageData = onDocumentWritten(
  'experiments/{experimentId}/stages/{stageId}',
  async (event) => {
    const data = event.data?.after.data() as StageConfig | undefined;
    if (!data) return;

    let publicData: PublicStageData | undefined;

    switch (data.kind) {
      case StageKind.VoteForLeader:
        publicData = {
          kind: data.kind,
          participantvotes: {},
          currentLeader: null,
        };
        break;
      case StageKind.GroupChat:
        // Initialize the custom chat data (depending on the chat kind)
        let chatData: PublicChatData;

        switch (data.chatConfig.kind) {
          case ChatKind.ChatAboutItems:
            chatData = {
              kind: ChatKind.ChatAboutItems,
              currentRatingIndex: 0,
              ratingsToDiscuss: data.chatConfig.ratingsToDiscuss, // Also publish the config again for convenience
            };
            break;
          default: // SimpleChat
            chatData = {
              kind: ChatKind.SimpleChat,
            };
        }

        // Read the number of participants from the experiment document
        const experimentDoc = await app
          .firestore()
          .doc(`experiments/${event.params.experimentId}`)
          .get();
        const { numberOfParticipants } = experimentDoc.data() as Experiment;

        publicData = {
          kind: data.kind,
          numberOfParticipants,
          readyToEndChat: {},
          chatData,
        };
        break;
      default:
        return;
    }

    // Write the public data into a document
    const publicStageData = app
      .firestore()
      .doc(`experiments/${event.params.experimentId}/publicStageData/${event.params.stageId}`);

    publicStageData.set(publicData);
  },
);

/** When a participant updates stage answers, publish the answers to  */
export const publishStageData = onDocumentWritten(
  'experiments/{experimentId}/participants/{participantId}/stages/{stageName}',
  async (event) => {
    const data = event.data?.after.data() as StageAnswer | undefined;
    if (!data) return;

    const { experimentId, participantId, stageName } = event.params;

    switch (data.kind) {
      case StageKind.VoteForLeader:
        // Read the document 1st to avoid 2 writes
        const publicDoc = await app
          .firestore()
          .doc(`experiments/${experimentId}/publicStageData/${stageName}`)
          .get();
        const publicData = publicDoc.data() as VoteForLeaderStagePublicData;

        // Compute the updated votes
        const newVotes = publicData.participantvotes;
        newVotes[participantId] = data.votes;

        // Compute the new leader with these votes
        const currentLeader = chooseLeader(allVoteScores(newVotes));

        // Update the public data
        await publicDoc.ref.update({
          participantvotes: newVotes,
          currentLeader,
        });

        break;
      case StageKind.TakeSurvey:
        // Nothing to publish
        break;
    }
  },
);
