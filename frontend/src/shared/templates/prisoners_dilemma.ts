import {
  createAgentChatSettings,
  createAgentMediatorPersonaConfig,
  createAgentParticipantPersonaConfig,
  createChatPromptConfig,
  createChatStage,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  createParticipantProfileBase,
  createProfileStage,
  createDefaultPromptFromText,
  createSurveyStage,
  createSurveyPerParticipantStage,
  createMultipleChoiceSurveyQuestion,
  createTextSurveyQuestion,
  createStageProgressConfig,
  createStageTextConfig,
  createScaleSurveyQuestion,
  createMultipleChoiceComprehensionQuestion,
  AgentMediatorTemplate,
  AgentParticipantTemplate,
  AgentPersonaType,
  ExperimentTemplate,
  MediatorPromptConfig,
  ParticipantPromptConfig,
  ProfileType,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************

export function getPrisonersDilemmaTemplate(
  nStages: number = 5, // Default to 5 stages
  payoutMatrixJson: string,
): ExperimentTemplate {
  const stageConfigs = getPrisonersDilemmaStageConfigs(nStages, payoutMatrixJson);

  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, { metadata: PRISONERS_DILEMMA_METADATA }),
    stageConfigs,
    agentMediators: [],
    agentParticipants: [],
  });
}

export const PRISONERS_DILEMMA_METADATA = createMetadataConfig({
  name: "Prisoner's Dilemma",
  publicName: "Prisoner's Dilemma",
  description:
    "A multi-stage game theory negotiation where participants must choose to cooperate or defect.",
});

// ****************************************************************************
// STATIC STAGES (These only appear once)
// ****************************************************************************

const SET_PROFILE_STAGE = createProfileStage({
  id: 'profile-stage',
  name: 'Set profile',
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  descriptions: createStageTextConfig({ primaryText: '', infoText: '', helpText: '' }),
  progress: createStageProgressConfig({ showParticipantProgress: true }),
});

// ****************************************************************************
// DYNAMIC STAGE FACTORIES (These are called for each round)
// ****************************************************************************

/** Creates a negotiation chat room for a specific round. */
function createNegotiationChatStage(round: number, payoutMatrixJson: string): StageConfig {
  const dataPrefix = `PAYOUT_MATRIX_DATA::${payoutMatrixJson}`;

  // Create a user-friendly display of the payout matrix.
  let matrixDisplay = `Payouts:\n${payoutMatrixJson}`;
  try {
    const matrix = JSON.parse(payoutMatrixJson);
    matrixDisplay = `
      - If you both Cooperate: You both get ${matrix.cooperate_cooperate[0]} points.
      - If you both Defect: You both get ${matrix.defect_defect[0]} points.
      - If you Cooperate and they Defect: You get ${matrix.cooperate_defect[0]}, they get ${matrix.cooperate_defect[1]}.
      - If you Defect and they Cooperate: You get ${matrix.defect_cooperate[0]}, they get ${matrix.defect_cooperate[1]}.
    `;
  } catch (e) {
    console.error('Could not parse payout matrix for display in chat stage', e);
  }

  const dilemmaDescription = "This is a Prisoner's Dilemma game. You and your partner must individually choose to either Cooperate or Defect. Your score in this round depends on the combination of both your choices.";
  
  // Combine all information into the main text for the chat stage.
  const primaryText = `
    You will now enter a chat to discuss your strategy for Round ${round}.

    **Game Rules:**
    ${dilemmaDescription}

    **Payouts for this round:**
    ${matrixDisplay}
  `;

  return createChatStage({
    id: `negotiation-chat-${round}`,
    name: `Negotiation - Round ${round}`,
    descriptions: createStageTextConfig({
      // UPDATED: Use the new, more detailed primary text.
      primaryText: primaryText,
      infoText: 'You can try to convince your partner to make a certain move.',
      // Embed the data in an existing, valid property.
      helpText: dataPrefix, 
    }),
    timeLimitInMinutes: 3,
    progress: createStageProgressConfig({
      showParticipantProgress: true,
      waitForAllParticipants: true,
      minParticipants: 2,
    }),
  });
}

/** Creates a decision survey for a specific round. */
function createDecisionStage(round: number, payoutMatrixJson: string): StageConfig {
  const dataPrefix = `PAYOUT_MATRIX_DATA::${payoutMatrixJson}`;
  
  // Try to parse the matrix to display it nicely for the user.
  let matrixDisplay = payoutMatrixJson;
  try {
    const matrix = JSON.parse(payoutMatrixJson);
    matrixDisplay = `
      - If you both Cooperate: You both get ${matrix.cooperate_cooperate[0]} points.
      - If you both Defect: You both get ${matrix.defect_defect[0]} points.
      - If you Cooperate and they Defect: You get ${matrix.cooperate_defect[0]}, they get ${matrix.cooperate_defect[1]}.
      - If you Defect and they Cooperate: You get ${matrix.defect_cooperate[0]}, they get ${matrix.defect_cooperate[1]}.
    `;
  } catch (e) {
    console.error('Could not parse payout matrix for display in decision stage', e);
  }

  return createSurveyStage({
    id: `decision-survey-${round}`,
    name: `Decision - Round ${round}`,
    descriptions: createStageTextConfig({
      primaryText: `It's time to make your decision for Round ${round}.`,
      infoText: `Remember the payout matrix:\n${matrixDisplay}`,
      // Embed the data here as well, along with any other help text.
      helpText: `Your choice will not be revealed to the other participant until you both have decided.\n${dataPrefix}`,
    }),
    progress: createStageProgressConfig({ showParticipantProgress: true }),
    questions: [
      createMultipleChoiceSurveyQuestion({
        id: `decision-${round}`,
        questionTitle: 'I choose to:',
        options: [
          { id: `cooperate-${round}`, text: 'Cooperate', imageId: '' },
          { id: `defect-${round}`, text: 'Defect', imageId: '' },
        ],
      }),
    ],
  });
}


// ****************************************************************************
// Main Stage Assembler Function
// ****************************************************************************

function getPrisonersDilemmaStageConfigs(nStages: number, payoutMatrix: string): StageConfig[] {
  const stages: StageConfig[] = [];

  // 1. Add the initial, static profile stage.
  stages.push(SET_PROFILE_STAGE);

  // 2. Generate the dynamic, repeating stages for each round of the dilemma.
  for (let i = 1; i <= nStages; i++) {
    const negotiationChat = createNegotiationChatStage(i, payoutMatrix);
    const decisionStage = createDecisionStage(i, payoutMatrix);

    // Add the block of stages for this round in the correct order.
    stages.push(negotiationChat, decisionStage);
  }

  return stages;
}