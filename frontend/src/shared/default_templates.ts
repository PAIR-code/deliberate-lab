import {
  Experiment,
  ExperimentTemplate,
  MetadataConfig,
  StageConfig,
  Visibility,
  createExperimentTemplate,
} from '@deliberation-lab/utils';

import {
  LAS_METADATA,
  ANON_LAS_METADATA,
  getLASStageConfigs,
  getAnonLASStageConfigs,
} from './templates/lost_at_sea';
import {
  getChipMetadata,
  getChipNegotiationStageConfigs,
} from './templates/chip_negotiation';
import {
  getCharityDebateTemplate,
  createCharityDebateConfig,
  CHARITY_DEBATE_METADATA,
} from './templates/charity_allocations';
import {
  getOOTBCharityDebateTemplate,
  OOTB_CHARITY_DEBATE_METADATA,
} from './templates/charity_allocations_ootb';
import {
  CONSENSUS_METADATA,
  getConsensusTopicTemplate,
} from './templates/debate_topics';
import {
  FRUIT_TEST_METADATA,
  getFruitTestExperimentTemplate,
} from './templates/fruit_test';
import {
  STOCKINFO_GAME_METADATA,
  getStockInfoGameStageConfigs,
} from './templates/stockinfo_template';
import {
  FLIPCARD_TEMPLATE_METADATA,
  getFlipCardExperimentTemplate,
} from './templates/flipcard';
import {
  ASSET_ALLOCATION_TEMPLATE_METADATA,
  getAssetAllocationTemplate,
} from './templates/asset_allocation_template';
import {
  CONDITIONAL_SURVEY_TEMPLATE_METADATA,
  getConditionalSurveyTemplate,
} from './templates/conditional_survey_template';
import {POLICY_METADATA, getPolicyExperimentTemplate} from './templates/policy';
import {
  INTEGRATION_METADATA,
  getAgentParticipantIntegrationTemplate,
} from './templates/agent_participant_integration_template';

import {
  getQuickstartAgentGroupChatTemplate,
  getQuickstartGroupChatTemplate,
} from './templates/quickstart_group_chat';
import {getQuickstartPrivateChatTemplate} from './templates/quickstart_private_chat';

// Interface for code-based templates to be displayed in the gallery
export interface CodeBasedTemplate {
  id: string; // concise ID for tracking/keys
  name: string;
  description: string;
  // If true, this is a research template (gated)
  isResearch?: boolean;
  // Function to generate the template
  factory: () => ExperimentTemplate;
}

// Helper to convert stage-list templates to full ExperimentTemplate
function createTemplate(
  metadata: Partial<MetadataConfig>,
  stages: StageConfig[],
): ExperimentTemplate {
  return {
    id: '', // Placeholder, logic usually allows empty ID for new templates or code templates don't track ID
    visibility: Visibility.PUBLIC,
    stageConfigs: stages,
    agentMediators: [],
    // cast to unknown to avoid strict Experiment interface checks for fields we don't care about in templates (like IDs that get regenerated)
    // or better, fill defaults.
    experiment: {
      id: '',
      versionId: 19,
      metadata: {
        creator: 'system',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        publicMetadata: {},
        starred: {},
        tags: [],
        ...metadata,
      },
      permissions: {
        visibility: Visibility.PUBLIC,
        readers: [],
        editors: [],
      },
      stageIds: stages.map((s) => s.id),
      defaultCohortConfig: {
        minParticipantsPerCohort: 1, // Default to 1 to compile, logic might overwrite
        maxParticipantsPerCohort: 100,
        includeAllParticipantsInCohortCount: false,
        botProtection: false,
      },
      prolificConfig: {
        enableProlificIntegration: false,
        attentionFailRedirectCode: '',
        defaultRedirectCode: '',
        bootedRedirectCode: '',
      },
      agentConfig: {
        agentEndpoints: {},
      },
      cohortLockMap: {},
      variableConfigs: [],
      variableMap: {},
    } as unknown as Experiment,
    agentParticipants: [],
  };
}

export const DEFAULT_TEMPLATES: CodeBasedTemplate[] = [
  {
    id: 'blank',
    name: 'Build experiment from scratch',
    description: 'Start with an empty experiment configuration.',
    factory: () => createExperimentTemplate({}),
  },
  {
    id: 'quickstart_agent_chat',
    name: 'Group chat with agent mediator',
    description: 'A group chat facilitated by an LLM agent.',
    factory: getQuickstartAgentGroupChatTemplate,
  },
  {
    id: 'quickstart_private_chat',
    name: 'Private chat with agent',
    description: '1:1 chat between a participant and an agent.',
    factory: getQuickstartPrivateChatTemplate,
  },
  {
    id: 'quickstart_group_chat',
    name: 'Group chat with no agents',
    description: 'A standard group chat without AI mediation.',
    factory: getQuickstartGroupChatTemplate,
  },
  {
    id: 'flipcard',
    name: FLIPCARD_TEMPLATE_METADATA.name,
    description: FLIPCARD_TEMPLATE_METADATA.description,
    factory: getFlipCardExperimentTemplate,
  },
  {
    id: 'fruit_test',
    name: FRUIT_TEST_METADATA.name,
    description: FRUIT_TEST_METADATA.description,
    factory: getFruitTestExperimentTemplate,
  },
  {
    id: 'conditional_survey',
    name: CONDITIONAL_SURVEY_TEMPLATE_METADATA.name,
    description: CONDITIONAL_SURVEY_TEMPLATE_METADATA.description,
    factory: () =>
      createTemplate(
        CONDITIONAL_SURVEY_TEMPLATE_METADATA,
        getConditionalSurveyTemplate(),
      ),
  },
  {
    id: 'stock_info',
    name: STOCKINFO_GAME_METADATA.name,
    description: STOCKINFO_GAME_METADATA.description,
    factory: () =>
      createTemplate(STOCKINFO_GAME_METADATA, getStockInfoGameStageConfigs()),
  },
  {
    id: 'asset_allocation',
    name: ASSET_ALLOCATION_TEMPLATE_METADATA.name,
    description: ASSET_ALLOCATION_TEMPLATE_METADATA.description,
    factory: () =>
      createTemplate(
        ASSET_ALLOCATION_TEMPLATE_METADATA,
        getAssetAllocationTemplate(),
      ),
  },
  {
    id: 'policy',
    name: POLICY_METADATA.name,
    description: POLICY_METADATA.description,
    factory: getPolicyExperimentTemplate,
  },
  {
    id: 'agent_integration',
    name: INTEGRATION_METADATA.name,
    description: INTEGRATION_METADATA.description,
    factory: getAgentParticipantIntegrationTemplate,
  },
];

export const RESEARCH_TEMPLATES: CodeBasedTemplate[] = [
  {
    id: 'lost_at_sea',
    name: LAS_METADATA.name,
    description: LAS_METADATA.description,
    isResearch: true,
    factory: () => createTemplate(LAS_METADATA, getLASStageConfigs()),
  },
  {
    id: 'lost_at_sea_anon',
    name: ANON_LAS_METADATA.name,
    description: ANON_LAS_METADATA.description,
    isResearch: true,
    factory: () => createTemplate(ANON_LAS_METADATA, getAnonLASStageConfigs()),
  },
  {
    id: 'chip_negotiation_2',
    name: getChipMetadata(2).name,
    description: getChipMetadata(2).description,
    isResearch: true,
    factory: () =>
      createTemplate(getChipMetadata(2), getChipNegotiationStageConfigs(2)),
  },
  {
    id: 'chip_negotiation_3',
    name: getChipMetadata(3).name,
    description: getChipMetadata(3).description,
    isResearch: true,
    factory: () =>
      createTemplate(getChipMetadata(3), getChipNegotiationStageConfigs(3)),
  },
  {
    id: 'chip_negotiation_4',
    name: getChipMetadata(4).name,
    description: getChipMetadata(4).description,
    isResearch: true,
    factory: () =>
      createTemplate(getChipMetadata(4), getChipNegotiationStageConfigs(4)),
  },
  {
    id: 'consensus_debate',
    name: CONSENSUS_METADATA.name + ' (Default Topic: Climate Change)',
    description: CONSENSUS_METADATA.description,
    isResearch: true,
    factory: () => getConsensusTopicTemplate('Climate Change'),
  },
  {
    id: 'charity_debate',
    name: CHARITY_DEBATE_METADATA.name,
    description: CHARITY_DEBATE_METADATA.description,
    isResearch: true,
    factory: () => getCharityDebateTemplate(createCharityDebateConfig()),
  },
  {
    id: 'charity_debate_ootb',
    name: OOTB_CHARITY_DEBATE_METADATA.name,
    description: OOTB_CHARITY_DEBATE_METADATA.description,
    isResearch: true,
    factory: () => getOOTBCharityDebateTemplate(createCharityDebateConfig()),
  },
];
