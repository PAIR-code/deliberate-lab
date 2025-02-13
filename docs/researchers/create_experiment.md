---
title: Create experiment
layout: default
---

To create a new experiment, use the button in the top right corner to navigate
to the "New experiment" page.

<!-- TODO: Add screenshot -->

> Tip: You can edit your experiment after creating it!

After setting up the experiment config and adding a specific game
and/or individual experiment stages, use the button in the top
right corner to save your experiment. This will make it available
from the home page gallery.

## Experiment config

**Name**: *Private* experiment name is required and only shown to researchers
who have allowlist access to the platform **and** specific access to the
experiment. *Public* experiment name is shown to participants (if left
empty, participant will just see "Experiment" as the title).

**Permissions**: If *private*, only the creator will be able to edit and
view the experiment. If *public*, the creator alone will be able to edit
the experiment metadata and stage configurations, but all researchers
with allowlist access to the platform will be able to view the experiment
and manage cohorts and participants (if you provide them with the experiment
link).

## Add stages

Navigate to the "stages" tab in the left bar, then use the "Add stage" button
to add individual stages
or load a template (pre-configured set of stages).

<!-- TODO: Add screenshot -->

### Stage properties

Below are the settings you can configure for each stage:

- **Stage description**: The text will appear as a description on the stage.
- **Info popup text**: Adds an ⓘ icon to the stage, displaying this text when clicked.
- **Help popup text**: Adds help text for participants.
- **Wait for all participants before starting stage**: When enabled, the stage will not begin until all participants in the experiment are ready.
- **Show participant progress**: Displays a progress banner (e.g., "X of X participants have completed this stage") to track other participants’ progress.

Here is an example of a participant preview for an info stage with a description, info popup text, help popup text, and participant progress tracking enabled.

<!-- TODO: Add screenshot -->

### Stage types
<!-- TODO: Refactor into collection -->
Here’s a description of the supported stages in experiment creation:

- **Terms of Service**: Displays the Terms of Service. Participants must accept the terms to proceed.
- **Profile**: Participants can set their name, pronouns, and avatar.
  - Option to generate anonymous animal-themed profiles. If enabled, participants will be randomly assigned a profile (e.g., Dog, Cat).
  - This image shows the participant's view of a "Set profile" stage.
- **Info**: Use this stage to provide information to participants.
- **Survey**: Add survey questions like free-text, checkboxes (yes/no), multiple choice, or scale questions.
- **Ranking/Election**: Allows participants to rank items (or other participants). If "Conduct an election" is selected, a winner will be computed from the rankings.
- **Reveal**: Combine **Survey** or **Ranking/Election** stages here. You can choose to reveal answers to the cohort. Make sure to inform participants if their answers will be visible to others.
- **Payout**: Displays the participant’s payout for the stage.
  - Participants can receive a fixed amount or a payout based on an **Election** outcome.
- **Group Chat**: Opens a chat for the cohort. Add LLM agents with the "Add mediator" button. Agents will have conversation context.
  - String Parsing: Use "If you want to say something, contribute as X. Otherwise, respond with an empty string."
  - JSON Parsing: Allows querying additional explanations from the model.
    ```json
    INSTRUCTIONS:
    Fill out the following JSON response:
      1. Do you want to add a message to the chat? ("true" or false)
      2. If yes, what would you like to say?
      3. Why do you want to say that?

    EXAMPLE OUTPUT:
    {
      "shouldRespond": true,
      "response": "This is my response",
      "reasoning": "This is why I chose this response."
    }
    ```
- **Transfer**: A waiting stage where participants are transferred to a different cohort. We recommend creating a "Lobby" cohort for an experiment, and then transferring participants into breakout cohorts as needed.