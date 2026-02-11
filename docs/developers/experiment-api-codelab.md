---
layout: default
title: "Codelab: Create a Demo Experiment via API"
description: "Step-by-step tutorial for programmatically creating experiments using the Deliberate Lab API"
---

# Create a Demo Experiment via API

This codelab walks you through creating a complete experiment programmatically using the Deliberate Lab REST API and Python client.

| | |
|---|---|
| **Time** | ~30 minutes |
| **Level** | Beginner |
| **Goal** | Create a multi-stage experiment with AI agents |

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Multi-Stage Experiments](#2-building-a-multi-stage-experiment)
3. [Adding AI Agents](#3-adding-ai-agents)
4. [Managing Cohorts](#4-managing-cohorts)
5. [Exporting Data](#5-exporting-data)
6. [Complete Example](#6-complete-example-restaurant-decision-study)

---

## Prerequisites

- Python 3.11+ (required for typed models)
- A Deliberate Lab API key ([create one in Settings](./api.md#creating-an-api-key))

**Install the Python client:**

```bash
pip install git+https://github.com/PAIR-code/deliberate-lab.git#subdirectory=scripts
```

**Set your API key:**

```bash
export DL_API_KEY="your_api_key_here"
```

> [!TIP]
> Use `env="dev"` when testing with a local emulator, and `env="prod"` for production.

---

## 1. Quick Start

We can create a very simple experiment:

```python
import deliberate_lab as dl

client = dl.Client(env="prod")  # Use env="dev" for local emulator

# Create experiment with just a name
result = client.create_experiment(name="My First Experiment")
print(f"Created experiment: {result['experiment']['id']}")
```

Ta da! You did it! Codelab done! Just kidding. Haha. More codelab below.

---

## 2. Building a Multi-Stage Experiment

Real experiments need stages. Let's create one with a **profile**, **survey**, and **chat** stage:

```python
import deliberate_lab as dl

client = dl.Client(env="prod")

# Define stage configurations
stages = [
    # Stage 1: Profile setup (anonymous animal names)
    dl.ProfileStageConfig(
        id="profile",
        kind="profile",
        name="Profile Setup",
        descriptions={"primaryText": "Set up your profile", "infoText": "", "helpText": ""},
        progress={"minParticipants": 1, "waitForAllParticipants": False, "showParticipantProgress": False},
        profileType=dl.ProfileType.ANONYMOUS_ANIMAL,
    ),
    
    # Stage 2: Pre-discussion survey
    dl.SurveyStageConfig(
        id="pre-survey",
        kind="survey",
        name="Pre-Discussion Survey",
        descriptions={"primaryText": "Answer a few questions before the discussion", "infoText": "", "helpText": ""},
        progress={"minParticipants": 1, "waitForAllParticipants": False, "showParticipantProgress": False},
        questions=[
            dl.TextSurveyQuestion(
                id="q1",
                kind="text",
                questionTitle="What topic would you like to discuss today?",
            ),
            dl.ScaleSurveyQuestion(
                id="q2",
                kind="scale",
                questionTitle="How familiar are you with group discussions?",
                lowerValue=1,
                lowerText="Not at all",
                upperValue=5,
                upperText="Very familiar",
            ),
            dl.MultipleChoiceSurveyQuestion(
                id="q3",
                kind="mc",
                questionTitle="What's your preferred discussion style?",
                options=[
                    dl.MultipleChoiceItem(id="opt1", text="Collaborative", imageId=""),
                    dl.MultipleChoiceItem(id="opt2", text="Debate-oriented", imageId=""),
                    dl.MultipleChoiceItem(id="opt3", text="Listener", imageId=""),
                ],
            ),
        ],
    ),
    
    # Stage 3: Group chat (10 minute discussion)
    dl.ChatStageConfig(
        id="discussion",
        kind="chat",
        name="Group Discussion",
        descriptions={"primaryText": "Discuss the topic with your group", "infoText": "", "helpText": ""},
        progress={"minParticipants": 2, "waitForAllParticipants": True, "showParticipantProgress": True},
        timeLimitInMinutes=10,
    ),
]

# Create the experiment
result = client.create_experiment(
    name="Demo Discussion Study",
    description="A demo experiment with profile, survey, and chat stages",
    stages=stages,
)

experiment_id = result["experiment"]["id"]
print(f"Created experiment: {experiment_id}")
```

> [!NOTE]
> The `descriptions` dict requires `primaryText`, `infoText`, and `helpText` keys. Use empty strings for optional fields.

---

## 3. Adding AI Agents

Add an AI agent that can participate in the chat:

```python
import deliberate_lab as dl

client = dl.Client(env="prod")

# Define the AI agent persona and prompt
agent_mediator = dl.AgentMediatorTemplate(
    persona=dl.Persona(
        id="helper-agent",
        name="Helper",
        defaultModelSettings=dl.AgentModelSettings(
            apiType=dl.ApiKeyType.GEMINI,
            modelName="gemini-2.0-flash",
        ),
    ),
    promptMap={
        "discussion": dl.ChatPromptConfig(
            id="discussion",
            type=dl.ChatStageType.chat,
            prompt=[
                dl.TextPromptItem(
                    type="TEXT",
                    text="""You are a helpful discussion facilitator. 
Your role is to:
- Help keep the conversation on track
- Ask clarifying questions when needed  
- Summarize key points periodically
- Stay neutral and encourage all participants

Only speak when it adds value. Keep responses concise (1-2 sentences).""",
                ),
            ],
            chatSettings=dl.AgentChatSettings(
                minMessagesBeforeResponding=3,
                canSelfTriggerCalls=True,
                initialMessage="",
            ),
        ),
    },
)

# Create experiment with stages (from previous section) and agent
result = client.create_experiment(
    name="Demo with AI Facilitator",
    description="A discussion experiment with an AI facilitator",
    stages=stages,  # stages from previous section
    agent_mediators=[agent_mediator],
)

print(f"Created experiment with agent: {result['experiment']['id']}")
```

> [!TIP]
> Use `minMessagesBeforeResponding` to prevent the agent from dominating early conversation.

---

## 4. Managing Cohorts

Cohorts are groups of participants within an experiment:

```python
# Create a cohort for 3-5 participants
cohort_result = client.create_cohort(
    experiment_id=experiment_id,
    name="Cohort A",
    description="First group of participants",
    participant_config=dl.CohortParticipantConfig(
        minParticipantsPerCohort=3,
        maxParticipantsPerCohort=5,
        includeAllParticipantsInCohortCount=True,
        botProtection=True,
    ),
)

cohort_id = cohort_result["cohort"]["id"]
print(f"Created cohort: {cohort_id}")

# List all cohorts
cohorts = client.list_cohorts(experiment_id)
print(f"Total cohorts: {cohorts['total']}")
```

---

## 5. Exporting Data

Export all experiment data including participant responses:

```python
# Export full experiment data
data = client.export_experiment(experiment_id)

# Access exported structure (uses Map format)
experiment = data["experiment"]
stage_map = data["stageMap"]
cohort_map = data["cohortMap"]
participant_map = data["participantMap"]

print(f"Experiment: {experiment['metadata']['name']}")
print(f"Stages: {len(stage_map)}")
print(f"Cohorts: {len(cohort_map)}")
print(f"Total participants: {len(participant_map)}")

# Save to file
import json
with open("experiment_export.json", "w") as f:
    json.dump(data, f, indent=2)
```

---

## 6. Complete Example: Restaurant Decision Study

Here's a full working example that creates a "Restaurant Decision" demo experiment:

<details>
<summary><strong>View Complete Script</strong></summary>

```python
#!/usr/bin/env python3
"""
Complete example: Create a Restaurant Decision demo experiment.

Usage:
    export DL_API_KEY="your_api_key"
    python create_restaurant_demo.py
"""

import deliberate_lab as dl


def create_restaurant_demo():
    client = dl.Client(env="prod")

    # Stage 1: Profile
    profile_stage = dl.ProfileStageConfig(
        id="profile",
        kind="profile",
        name="Join the Discussion",
        descriptions={
            "primaryText": "Choose your display name to join",
            "infoText": "",
            "helpText": "",
        },
        progress={
            "minParticipants": 1,
            "waitForAllParticipants": False,
            "showParticipantProgress": False,
        },
        profileType=dl.ProfileType.ANONYMOUS_ANIMAL,
    )

    # Stage 2: Context survey
    survey_stage = dl.SurveyStageConfig(
        id="preferences",
        kind="survey",
        name="Your Preferences",
        descriptions={
            "primaryText": "Tell us about your dining preferences",
            "infoText": "",
            "helpText": "",
        },
        progress={
            "minParticipants": 1,
            "waitForAllParticipants": False,
            "showParticipantProgress": False,
        },
        questions=[
            dl.MultipleChoiceSurveyQuestion(
                id="cuisine",
                kind="mc",
                questionTitle="What cuisine are you in the mood for?",
                options=[
                    dl.MultipleChoiceItem(id="italian", text="Italian", imageId=""),
                    dl.MultipleChoiceItem(id="asian", text="Asian", imageId=""),
                    dl.MultipleChoiceItem(id="mexican", text="Mexican", imageId=""),
                    dl.MultipleChoiceItem(id="american", text="American", imageId=""),
                    dl.MultipleChoiceItem(id="other", text="Other/No preference", imageId=""),
                ],
            ),
            dl.ScaleSurveyQuestion(
                id="budget",
                kind="scale",
                questionTitle="What's your budget per person?",
                lowerValue=10,
                lowerText="$10",
                upperValue=100,
                upperText="$100+",
            ),
        ],
    )

    # Stage 3: Group discussion
    chat_stage = dl.ChatStageConfig(
        id="discussion",
        kind="chat",
        name="Restaurant Discussion",
        descriptions={
            "primaryText": "Discuss and decide on a restaurant together!",
            "infoText": "You have 10 minutes to come to a consensus.",
            "helpText": "",
        },
        progress={
            "minParticipants": 2,
            "waitForAllParticipants": True,
            "showParticipantProgress": True,
        },
        timeLimitInMinutes=10,
    )

    # Stage 4: Final survey
    final_survey = dl.SurveyStageConfig(
        id="final-survey",
        kind="survey",
        name="Wrap Up",
        descriptions={
            "primaryText": "Quick feedback on the discussion",
            "infoText": "",
            "helpText": "",
        },
        progress={
            "minParticipants": 1,
            "waitForAllParticipants": False,
            "showParticipantProgress": False,
        },
        questions=[
            dl.TextSurveyQuestion(
                id="decision",
                kind="text",
                questionTitle="What restaurant did your group decide on?",
            ),
            dl.ScaleSurveyQuestion(
                id="satisfaction",
                kind="scale",
                questionTitle="How satisfied are you with the group's decision?",
                lowerValue=1,
                lowerText="Not satisfied",
                upperValue=5,
                upperText="Very satisfied",
            ),
        ],
    )

    # AI Facilitator
    facilitator = dl.AgentMediatorTemplate(
        persona=dl.Persona(
            id="restaurant-helper",
            name="Gemini",
            defaultModelSettings=dl.AgentModelSettings(
                apiType=dl.ApiKeyType.GEMINI,
                modelName="gemini-2.0-flash",
            ),
        ),
        promptMap={
            "discussion": dl.ChatPromptConfig(
                id="discussion",
                type=dl.ChatStageType.chat,
                prompt=[
                    dl.TextPromptItem(
                        type="TEXT",
                        text="""You are Gemini, an AI assistant helping a group choose a restaurant.

Guidelines:
- Ask clarifying questions: cuisine preferences, budget, location, dietary needs
- Suggest specific restaurants when you have enough info (use web search)
- Help the group reach consensus
- Keep responses brief (1-3 sentences)
- Only speak when it adds value to the discussion""",
                    ),
                ],
                chatSettings=dl.AgentChatSettings(
                    minMessagesBeforeResponding=2,
                    canSelfTriggerCalls=True,
                    initialMessage="",
                ),
            ),
        },
    )

    # Create the experiment
    result = client.create_experiment(
        name="Restaurant Decision Demo",
        description="A demo experiment where participants decide on a restaurant together with AI assistance",
        stages=[profile_stage, survey_stage, chat_stage, final_survey],
        agent_mediators=[facilitator],
    )

    experiment_id = result["experiment"]["id"]
    print(f"✅ Created experiment: {experiment_id}")

    # Create a default cohort
    cohort = client.create_cohort(
        experiment_id=experiment_id,
        name="Default Cohort",
        description="Main participant group",
        participant_config=dl.CohortParticipantConfig(
            minParticipantsPerCohort=2,
            maxParticipantsPerCohort=5,
            includeAllParticipantsInCohortCount=True,
            botProtection=True,
        ),
    )
    print(f"✅ Created cohort: {cohort['cohort']['id']}")

    return experiment_id


if __name__ == "__main__":
    exp_id = create_restaurant_demo()
    print(f"\nDemo experiment ready!")
    print(f"   View at: https://deliberate-lab.web.app/e/{exp_id}")
```

</details>

> [!IMPORTANT]
> Remember to create at least one cohort after creating your experiment—participants need a cohort to join.

---

## Next Steps

| Resource | Description |
|----------|-------------|
| [API Reference](./api.md) | Full endpoint documentation with all parameters |
| [Agent Design](./agent-design.md) | Advanced agent configuration and prompt strategies |
| [Platform Design](./platform-design.md) | System architecture and data model overview |

---

<p align="center">
  <em>Have feedback on this codelab? Open an issue on <a href="https://github.com/PAIR-code/deliberate-lab">GitHub</a>!</em>
</p>
