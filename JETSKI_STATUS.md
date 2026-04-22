# Jetski Status

## Current State

- **Firestore Emulator Port Conflict**: Resolved by changing port from `8080` to `8081` in `firebase.json`, `frontend/src/shared/constants.ts`, and `run_locally.sh`.
- **Build Errors**: Resolved all TypeScript and resolution errors in `utils`, `frontend`, and `functions`.
- **Frontend Port Conflict**: Resolved by moving frontend to port `4204` (since `4203` was also in use by Jetski).
- **Database Port Conflict**: Resolved by freeing port `9000`.

## Investigation: Minimum Time Bug in Group Chat

- **Symptoms**: Participants can skip to the next stage even when a minimum time requirement is set.
- **Findings**:
    - Python configuration sets `timeMinimumInMinutes=10` correctly in `policy_mediation.py`.
    - TypeScript frontend has logic to disable the "Next Stage" button in `group_chat_participant_view.ts` based on `isMinimumTimeMet`.
    - The timer (`discussionStartTimestamp`) only starts when the first message is created, not when entering the stage.
    - If `discussions` list is empty (as it is in `policy_mediation.py`), the UI shows the "Next Stage" button instead of "Ready to end discussion", and if `isMinimumTimeMet` evaluates to true (or returns true due to undefined properties), the user can skip.
- **Status**: Awaiting full experiment JSON from user to verify if properties are being dropped or loaded incorrectly.

## Next Steps

- The environment is ready. Run `./run_locally.sh` to start the stack.
- Review the full experiment JSON when provided by the user.
