# Firebase trigger functions

Trigger functions listen to when documents at specified Firestore paths are
updated and call actions, e.g., querying LLM APIs for agent responses.


## onParticipantCreated
*When document is created at `experiments/{experimentId}/participants/{participantId}`*

- Initialize participant stage answers
- Start making agent participant calls if participant contains agent config


## onParticipantUpdated
*When document is updated at `experiments/{experimentId}/participants/{participantId}`*

Make agent participant calls to complete the current stage and advance to the
next stage.

If the participant has just reconnected, handle transfer state if applicable
(TODO: consolidate logic).


## onParticipantStageDataUpdated
*When document is updated at `experiments/{experimentId}/participants/{participantId}/stageData/{stageId}`*

When participant's private stage data is updated, call different actions
depending on the stage. Most of these actions involve updating the public
stage data for the participant's current cohort (e.g., survey answers
written to participant stage data are mirrored to the cohort's public stage
data).


## onPublicStageDataUpdated
*When document is updated at `experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}`*

When cohort's public stage data is updated, call different actions
depending on the stage, e.g., for chip stage, check if the transaction is
ready to be cleared.


## onPublicChatMessageCreated
*When document is updated at `experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}`*

When a new group chat message is created:
- Begin countdown timer if relevant
- Generate agent mediator responses to the chat message
- Generate agent participant responses to the chat message
- Check if agent participants are ready to end the current chat discussion

This includes specific actions for specific stages, e.g., for salesperson
stage, call different function to build agent chat messages (that sends
the salesperson game board as part of the prompt).


## onPrivateChatMessageCreated
*When document is updated at `experiments/{experimentId}/participants/{participantId}/stageData/{stageId}/privateChats/{chatId}`*

When a new private chat (only between current participant and mediators) is
created, generate agent mediator responses to the chat message.


## onChipTransactionCreated
*When document is updated at `experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/transactions/{transactionId}`*

When a new chip transaction is written, update participants' chip quantities.

TODO: Refactor this into `onPublicStageDataUpdated`.


## mirrorPresenceToFirestore
*When participant's presence status changes in the Realtime database*

Set participant to connected/disconnected.