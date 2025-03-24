---
title: Create experiment
layout: default
---

<iframe class="yt-wrapper" type="text/html"
  src="https://www.youtube.com/embed/gRShx7_cj2Y?autoplay=1&list=PLpC76pxkGLrBb5R7NViRloBzUkn8UQbr0&origin=http://pair-code.github.io/deliberatelab"
  frameborder="0">
</iframe>

## Build experiment from scratch
To create a new experiment, use the button in the top right corner to navigate
to the "New experiment" page.

> Tip: You can edit your experiment after creating it!

After setting up the experiment config and adding a specific game
and/or individual experiment stages, use the button in the top
right corner to save your experiment. This will make it available
from the home page gallery.

### Experiment metadata

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

### Stage properties

Below are the settings you can configure for each stage:

- **Stage description**: The text will appear as a description at the top of the stage
- **Info popup text**: Adds an ⓘ icon to the stage that will display this text when clicked
- **Help popup text**: Adds a help icon to the stage that will display this text when clicked
- **Wait for all active participants**: When enabled, the stage will not begin until all participants in the cohort have reached this stage
- **Wait for a fixed number of participants**: When enabled, the stage will not begin until the specified number of participants (in the cohort) have reached this stage
- **Show participant progress**: Displays a progress banner (e.g., "X of X participants have completed this stage") where X is all participants in the cohort

### Stage types
<!-- TODO: Refactor into collection -->
Supported experiment stages include:

- **Terms of Service**: Displays the Terms of Service. Participants must accept the terms to proceed
- **Profile**: Participants can set their name, pronouns, and avatar. If "anonymous animal-themed profiles" is enabled, participants will be randomly assigned a profile (e.g., Dog, Cat)
- **Info**: Use this stage to provide information to participants
- **Survey**: Add survey questions like free-text, checkboxes (yes/no), multiple choice, or scale questions
- **Ranking/Election**: Allows participants to rank items (or other participants). If "Conduct an election" is selected, a winner will be computed from the rankings
- **Reveal**: Combine **Survey** or **Ranking/Election** stages here. You can choose to reveal answers to the cohort. Make sure to inform participants if their answers will be visible to others
- **Payout**: Calculates and displays the participant's payout for selected stages (can be a fixed amount for a stage or a calculation specific to that stage, e.g., number of correct survey answers)
- **Group Chat**: Opens a chat for the cohort (use the Agents tab to add mediators)
- **Transfer**: A waiting stage where participants can be manually transferred by the experimenter to a different cohort. We recommend creating a "Lobby" cohort for an experiment, and then transferring participants into breakout cohorts as needed

## Edit or fork experiment
To edit an experiment, click on its card in the home page gallery.

<!-- TODO: Add screenshot -->

At the bottom of the leftmost panel, fork or edit the current experiment.

For creators: general
experiment configurations (e.g., metadata, permissions, delete experiment)
can be edited at any time, but stages can only be adjusted if no cohorts
currently exist in the experiment.

Non-creators cannot edit the experiment metadata/stages, but they
can click to preview (same button in top right corner) the configurations.

## Preview experiment

> Coming soon: Simplified workflow for previewing an experiment

To preview or test your experiment, create a new cohort and add
a participant, then use the "participant preview" panel (or copy that
participant's experiment link) to see the participant's view.
Once you're done, delete the cohort to enable editing experiment stages.