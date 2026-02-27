---
title: Add LLM agent participants to experiment
layout: default
---

LLM agents can join experiments as participants. Each agent participant can have
its own individual prompt, but will otherwise run through an experiment in the
same way as a human would.

## Preparing an Experiment for Agent Participants

You can add agent participants to any experiment, as long as you have a Google
API key configured. (Right now, only Gemini models can be selected for agent
participants.) No other experiment-level config is necessary. However, we
recommend setting up your experiments with an eye for how agent participants
will see each stage.

**Experiment info**: Agent participants will see any text in the experiment info
  stage, but they won't see the contents of a linked Youtube video.

**Stage metadata**: This is where agent participants will see what each stage is
  about, so consider how clear your stage names and instructions are.
  
**Progress settings**: Agent participants may move through your experiment
  faster than you expect, or get stuck on chat stages where you don't expect.
  Consider checking "Wait for all active participants to reach this stage before
  allowing progression" before discussion stages, to prevent agents from moving
  on from a chat before humans arrive. Also consider setting a chat time limit,
  or describing specific goals for each chat stage.
  
**Profile settings**: If you select the option to assign random animal profiles
  to participants, be aware that the chosen animal could influence the agent's
  behavior! The agent will be reminded in its profile prompt that it is a human
  and not actually the given animal, so most models shouldn't try to respond as
  though they were the animal, but we can't rule out subtler effects.

## Adding Agent Participants to a Cohort

To add agent participants to a cohort:

- From the experiment overview screen, hit the icon to add a participant, and
  select "Add agent participant" from the menu.
- From the cohort management screen, click the icon at the top of the "Agent
  participants" section, which should appear between human participants and
  agent mediators.

You'll see a window to configure the agent: you'll need to select a
model for the agent to use, and you can optionally add a prompt context to give
to the agent. The prompt context may be useful for e.g. giving different
personalities or instructions to different agents. These settings will apply for
that agent across all experiment stages.

## Supported Stages

- Terms of Service
- Info
- Set Profile: If allowed to set their profile, agents will usually choose based
  on their prompt context.
- Survey
- Group Chat
- Private Chat
- Survey / Survey Per Participant
- Ranking
- Asset Allocation
- Stock Info

Not currently supported:

- Role assignment
- Comprehension check
- Payout
- Reveal

For details on how a stage implements agent participants, see
[Add stage](../developers/add-stage).

## Debugging Agent Participants

We recommend always doing test runs with agent participants before launching
your experiment. To see the details of an agent participant's response, click
the "LLM Logs" button on the left sidebar. Even if the agent is responding as
you expect, we recommend reviewing the prompts sent to the agent at each stage,
at least once. This will help you confirm that the agent is seeing exactly the
information it should be.
