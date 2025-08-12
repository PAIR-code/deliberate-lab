import {
  createAssetAllocationStage,
  createInfoStage,
  createMetadataConfig,
  createProfileStage,
  createStageTextConfig,
  createTOSStage,
  ProfileType,
  StageConfig,
} from '@deliberation-lab/utils';
import {STOCKINFO_MAIN_STAGE} from './stockinfo_template';

export const ASSET_ALLOCATION_TEMPLATE_METADATA = createMetadataConfig({
  name: 'Investment Portfolio Allocation',
  publicName: 'Portfolio Management Study',
  description:
    'A demonstration game using the AssetAllocation stage functionality for investment decision-making',
});

export function getAssetAllocationTemplate(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(ASSET_ALLOCATION_TOS_STAGE);
  stages.push(ASSET_ALLOCATION_PROFILE_STAGE);
  stages.push(ASSET_ALLOCATION_INTRO_STAGE);
  stages.push(ASSET_ALLOCATION_STOCKINFO_STAGE);
  stages.push(ASSET_ALLOCATION_MAIN_STAGE);

  return stages;
}

const ASSET_ALLOCATION_CONSENT =
  'You must agree to participate in this investment allocation demonstration. This is for research purposes only and does not constitute financial advice.';

const ASSET_ALLOCATION_TOS_STAGE = createTOSStage({
  id: 'asset_allocation_tos',
  name: 'Consent',
  tosLines: [ASSET_ALLOCATION_CONSENT],
});

const ASSET_ALLOCATION_PROFILE_STAGE = createProfileStage({
  id: 'asset_allocation_profile',
  name: 'Your identity',
  descriptions: createStageTextConfig({
    primaryText:
      "This is how you'll be identified during the investment study. Click 'Next stage' below to continue.",
  }),
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const ASSET_ALLOCATION_INTRO_TEXT = `
Welcome to the Investment Portfolio Allocation demonstration!

In this study, you'll:
1. **Review stock information** for two different companies
2. **Analyze performance data** including charts and key metrics
3. **Make investment decisions** by allocating a $1,000 portfolio between the two stocks
4. **Confirm your allocation** before proceeding

**Your Task:**
You have $1,000 to invest and must decide how to split it between two stocks. You can allocate anywhere from 0% to 100% to each stock, but your total allocation must equal 100%.

**Important Note:** This demonstration uses entirely fictional companies and simulated data. This is for demonstration and research purposes only. The information shown does not constitute financial advice and should not be used for actual investment decisions.
`;

const ASSET_ALLOCATION_INTRO_STAGE = createInfoStage({
  id: 'asset_allocation_intro',
  name: 'Investment Instructions',
  infoLines: [ASSET_ALLOCATION_INTRO_TEXT],
});

// Create a modified version of the imported StockInfo stage with only two stocks
const ASSET_ALLOCATION_STOCKINFO_STAGE = {
  ...STOCKINFO_MAIN_STAGE,
  id: 'asset_allocation_stockinfo',
  name: 'Stock Information Review',
  descriptions: createStageTextConfig({
    primaryText:
      'Review the information for both stocks before making your allocation decision. Click through both stocks to see their performance data and company details.',
  }),
  // Only keep the first two stocks from the template
  stocks: STOCKINFO_MAIN_STAGE.stocks.slice(0, 2),
  showInvestmentGrowth: true,
};

const ASSET_ALLOCATION_MAIN_STAGE = createAssetAllocationStage({
  id: 'asset_allocation_main',
  name: 'Portfolio Allocation Decision',
  descriptions: createStageTextConfig({
    primaryText:
      'Allocate your $1,000 investment between NexTech Solutions (NXTS) and GreenWave Energy (GRWV). Use the sliders to adjust your allocation.',
    infoText:
      'Based on the stock information you reviewed, decide how to split your $1,000 portfolio between the two stocks. Your allocations must total 100%.',
    helpText:
      'Drag the sliders to set your desired allocation percentages. The dollar amounts will update automatically. Click "Confirm Allocation" when you are satisfied with your decision.',
  }),
  stockConfig: {
    stockInfoStageId: 'asset_allocation_stockinfo',
    stockA: ASSET_ALLOCATION_STOCKINFO_STAGE.stocks[0],
    stockB: ASSET_ALLOCATION_STOCKINFO_STAGE.stocks[1],
  },
});
