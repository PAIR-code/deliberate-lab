import {
  createStockInfoStage,
  createStock,
  createStockInfoCard,
  createInfoStage,
  createMetadataConfig,
  createProfileStage,
  createStageTextConfig,
  createTOSStage,
  ProfileType,
  StageConfig,
} from '@deliberation-lab/utils';

export const STOCKINFO_GAME_METADATA = createMetadataConfig({
  name: 'Stock Analysis Game',
  publicName: 'Investment Research Study',
  description:
    'A demonstration game using the StockInfo stage functionality for financial data analysis',
});

export function getStockInfoGameStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(STOCKINFO_TOS_STAGE);
  stages.push(STOCKINFO_PROFILE_STAGE);
  stages.push(STOCKINFO_INTRO_STAGE);
  stages.push(STOCKINFO_MAIN_STAGE);

  return stages;
}

const STOCKINFO_CONSENT =
  'You must agree to participate in this stock information demonstration. This is for research purposes only and does not constitute financial advice.';

const STOCKINFO_TOS_STAGE = createTOSStage({
  id: 'stockinfo_tos',
  name: 'Consent',
  tosLines: [STOCKINFO_CONSENT],
});

const STOCKINFO_PROFILE_STAGE = createProfileStage({
  id: 'stockinfo_profile',
  name: 'Your identity',
  descriptions: createStageTextConfig({
    primaryText:
      "This is how you'll be identified during the stock analysis study. Click 'Next stage' below to continue.",
  }),
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const STOCKINFO_INTRO_TEXT = `
Welcome to the Stock Information demonstration!

In the next stage, you'll review financial information for different stocks. You'll see:
- **Performance cards** showing best and worst year returns for a $1,000 investment
- **Interactive charts** displaying price movements over time
- **Company summaries** with key information about each stock
- **Navigation buttons** to switch between different stocks

Take your time to explore the information for each stock. The system will track which stocks you view and how much time you spend reviewing each one.

**Important Note:** This demonstration uses entirely fictional companies and simulated data. This is for demonstration and research purposes only. The information shown does not constitute financial advice and should not be used for actual investment decisions.
`;

const STOCKINFO_INTRO_STAGE = createInfoStage({
  id: 'stockinfo_intro',
  name: 'Stock Analysis Instructions',
  infoLines: [STOCKINFO_INTRO_TEXT],
});

// Sample CSV data for fictional demonstration stocks - Weekly data for 2024-2025
const NEXTECH_CSV_DATA = `Date,Close
2024-01-01,125.50
2024-01-08,127.20
2024-01-15,129.85
2024-01-22,131.40
2024-01-29,133.75
2024-02-05,136.90
2024-02-12,139.25
2024-02-19,141.80
2024-02-26,144.35
2024-03-04,147.60
2024-03-11,150.20
2024-03-18,148.75
2024-03-25,146.90
2024-04-01,144.25
2024-04-08,141.80
2024-04-15,139.50
2024-04-22,142.15
2024-04-29,145.80
2024-05-06,148.90
2024-05-13,152.30
2024-05-20,155.70
2024-05-27,158.95
2024-06-03,162.40
2024-06-10,165.80
2024-06-17,169.25
2024-06-24,172.90
2024-07-01,175.60
2024-07-08,178.30
2024-07-15,174.85
2024-07-22,171.20
2024-07-29,168.75
2024-08-05,165.40
2024-08-12,162.90
2024-08-19,159.75
2024-08-26,156.20
2024-09-02,153.85
2024-09-09,157.40
2024-09-16,161.90
2024-09-23,166.25
2024-09-30,170.80
2024-10-07,175.30
2024-10-14,179.85
2024-10-21,184.20
2024-10-28,188.70
2024-11-04,193.40
2024-11-11,198.15
2024-11-18,202.90
2024-11-25,207.80
2024-12-02,212.45
2024-12-09,217.30
2024-12-16,222.85
2024-12-23,228.60
2024-12-30,234.20
2025-01-06,239.80
2025-01-13,245.60
2025-01-20,251.25
2025-01-27,256.90
2025-02-03,262.75
2025-02-10,268.40
2025-02-17,274.20
2025-02-24,279.85
2025-03-03,275.30
2025-03-10,270.85
2025-03-17,266.40
2025-03-24,261.95
2025-03-31,257.50
2025-04-07,253.20
2025-04-14,248.75
2025-04-21,244.30
2025-04-28,239.85
2025-05-05,235.40
2025-05-12,230.95
2025-05-19,226.50
2025-05-26,222.15
2025-06-02,217.80
2025-06-09,213.45
2025-06-16,209.10
2025-06-23,204.75
2025-06-30,200.40
2025-07-07,205.80
2025-07-14,211.25
2025-07-21,216.70
2025-07-28,222.15
2025-08-04,227.60
2025-08-11,233.05
2025-08-18,238.50
2025-08-25,243.95
2025-09-01,249.40
2025-09-08,254.85
2025-09-15,260.30
2025-09-22,265.75
2025-09-29,271.20
2025-10-06,276.65
2025-10-13,282.10
2025-10-20,287.55
2025-10-27,293.00
2025-11-03,298.45
2025-11-10,303.90
2025-11-17,309.35
2025-11-24,314.80
2025-12-01,320.25
2025-12-08,325.70
2025-12-15,331.15
2025-12-22,336.60
2025-12-29,342.05`;

const GREENWAVE_CSV_DATA = `Date,Close
2024-01-01,45.80
2024-01-08,52.30
2024-01-15,59.75
2024-01-22,67.20
2024-01-29,74.85
2024-02-05,83.40
2024-02-12,91.95
2024-02-19,101.20
2024-02-26,89.75
2024-03-04,78.60
2024-03-11,67.30
2024-03-18,56.85
2024-03-25,48.20
2024-04-01,41.75
2024-04-08,37.90
2024-04-15,35.25
2024-04-22,33.80
2024-04-29,32.45
2024-05-06,31.20
2024-05-13,34.85
2024-05-20,39.70
2024-05-27,45.30
2024-06-03,52.15
2024-06-10,59.80
2024-06-17,68.25
2024-06-24,77.40
2024-07-01,87.20
2024-07-08,97.85
2024-07-15,109.30
2024-07-22,121.75
2024-07-29,135.20
2024-08-05,149.85
2024-08-12,165.40
2024-08-19,181.95
2024-08-26,199.50
2024-09-02,218.25
2024-09-09,238.80
2024-09-16,225.40
2024-09-23,212.85
2024-09-30,201.20
2024-10-07,190.45
2024-10-14,180.60
2024-10-21,171.75
2024-10-28,163.90
2024-11-04,157.20
2024-11-11,151.45
2024-11-18,146.80
2024-11-25,142.95
2024-12-02,139.70
2024-12-09,137.25
2024-12-30,135.60
2025-01-06,138.75
2025-01-13,142.30
2025-01-20,146.85
2025-01-27,152.40
2025-02-03,158.95
2025-02-10,166.50
2025-02-17,175.25
2025-02-24,185.80
2025-03-03,197.35
2025-03-10,210.90
2025-03-17,226.45
2025-03-24,244.20
2025-03-31,263.75
2025-04-07,285.30
2025-04-14,308.85
2025-04-21,334.40
2025-04-28,361.95
2025-05-05,391.50
2025-05-12,423.25
2025-05-19,401.80
2025-05-26,381.35
2025-06-02,362.90
2025-06-09,346.45
2025-06-16,331.20
2025-06-23,317.75
2025-06-30,305.30
2025-07-07,294.85
2025-07-14,285.40
2025-07-21,277.95
2025-07-28,271.50
2025-08-04,266.25
2025-08-11,261.80
2025-08-18,258.35
2025-08-25,255.90
2025-09-01,254.45
2025-09-08,253.20
2025-09-15,252.75
2025-09-22,253.30
2025-09-29,254.85
2025-10-06,257.40
2025-10-13,260.95
2025-10-20,265.50
2025-10-27,271.25
2025-11-03,278.80
2025-11-10,287.35
2025-11-17,296.90
2025-11-24,307.45
2025-12-01,319.20
2025-12-08,331.75
2025-12-15,345.30
2025-12-22,359.85
2025-12-29,375.40`;

const GLOBALCONNECT_CSV_DATA = `Date,Close
2024-01-01,89.40
2024-01-08,90.15
2024-01-15,91.20
2024-01-22,92.75
2024-01-29,94.30
2024-02-05,95.85
2024-02-12,97.40
2024-02-19,99.20
2024-02-26,100.85
2024-03-04,102.50
2024-03-11,104.15
2024-03-18,105.80
2024-03-25,107.45
2024-04-01,109.10
2024-04-08,110.75
2024-04-15,112.40
2024-04-22,114.05
2024-04-29,115.70
2024-05-06,117.35
2024-05-13,119.00
2024-05-20,120.65
2024-05-27,122.30
2024-06-03,123.95
2024-06-10,125.60
2024-06-17,127.25
2024-06-24,128.90
2024-07-01,130.55
2024-07-08,132.20
2024-07-15,133.85
2024-07-22,135.50
2024-07-29,137.15
2024-08-05,132.80
2024-08-12,128.45
2024-08-19,124.10
2024-08-26,119.75
2024-09-02,115.40
2024-09-09,111.05
2024-09-16,106.70
2024-09-23,102.35
2024-09-30,98.20
2024-10-07,96.85
2024-10-14,95.50
2024-10-21,94.15
2024-10-28,92.80
2024-11-04,91.45
2024-11-11,90.10
2024-11-18,88.75
2024-11-25,87.40
2024-12-02,86.05
2024-12-09,84.70
2024-12-16,83.35
2024-12-23,82.00
2024-12-30,80.85
2025-01-06,82.50
2025-01-13,84.15
2025-01-20,85.80
2025-01-27,87.45
2025-02-03,89.10
2025-02-10,90.75
2025-02-17,92.40
2025-02-24,94.05
2025-03-03,95.70
2025-03-10,97.35
2025-03-17,99.00
2025-03-24,100.65
2025-03-31,102.30
2025-04-07,103.95
2025-04-14,105.60
2025-04-21,107.25
2025-04-28,108.90
2025-05-05,110.55
2025-05-12,112.20
2025-05-19,113.85
2025-05-26,115.50
2025-06-02,117.15
2025-06-09,118.80
2025-06-16,120.45
2025-06-23,122.10
2025-06-30,123.75
2025-07-07,125.40
2025-07-14,127.05
2025-07-21,128.70
2025-07-28,130.35
2025-08-04,132.00
2025-08-11,133.65
2025-08-18,135.30
2025-08-25,136.95
2025-09-01,138.60
2025-09-08,140.25
2025-09-15,141.90
2025-09-22,143.55
2025-09-29,145.20
2025-10-06,146.85
2025-10-13,148.50
2025-10-20,150.15
2025-10-27,151.80
2025-11-03,153.45
2025-11-10,155.10
2025-11-17,156.75
2025-11-24,158.40
2025-12-01,160.05
2025-12-08,161.70
2025-12-15,163.35
2025-12-22,165.00
2025-12-29,166.65`;

export const STOCKINFO_MAIN_STAGE = createStockInfoStage({
  id: 'stockinfo_main',
  name: 'Stock Analysis',
  stocks: [
    createStock({
      id: 'nextech_stock',
      name: 'NexTech Solutions (NXTS)',
      csvData: NEXTECH_CSV_DATA,
      description: `**NexTech Solutions** is a fictional technology company specializing in cloud computing, artificial intelligence, and enterprise software solutions.

**Key Business Areas:**
- Cloud infrastructure services
- AI-powered business analytics
- Enterprise software platforms
- Cybersecurity solutions
- Digital transformation consulting

**Market Position:** Leading provider of integrated technology solutions for medium to large enterprises, known for innovative AI applications and reliable cloud services.

**Recent Performance:** Steady growth trajectory with consistent revenue expansion driven by increased cloud adoption and AI service demand.`,
      customCards: [
        createStockInfoCard({
          title: 'Market Cap',
          value: '$1.2T',
          subtext: 'Major technology provider',
          enabled: true,
        }),
        createStockInfoCard({
          title: 'P/E Ratio',
          value: '24.8',
          subtext: 'Price-to-earnings multiple',
          enabled: true,
        }),
      ],
    }),
    createStock({
      id: 'greenwave_stock',
      name: 'GreenWave Energy (GRWV)',
      csvData: GREENWAVE_CSV_DATA,
      description: `**GreenWave Energy** is a fictional renewable energy company focused on solar, wind, and battery storage technologies.

**Key Business Areas:**
- Solar panel manufacturing
- Wind turbine development
- Energy storage systems
- Grid modernization technology
- Renewable energy consulting

**Market Position:** Emerging leader in the renewable energy sector with innovative storage solutions and efficient manufacturing processes.

**Recent Performance:** High growth potential with significant volatility due to regulatory changes, commodity prices, and clean energy adoption rates.`,
      customCards: [
        createStockInfoCard({
          title: 'Market Cap',
          value: '$450B',
          subtext: 'Fast-growing energy company',
          enabled: true,
        }),
        createStockInfoCard({
          title: 'Volatility',
          value: 'High',
          subtext: 'Subject to energy market fluctuations',
          enabled: true,
        }),
      ],
    }),
    createStock({
      id: 'globalconnect_stock',
      name: 'GlobalConnect Corp (GLBC)',
      csvData: GLOBALCONNECT_CSV_DATA,
      description: `**GlobalConnect Corp** is a fictional telecommunications and networking company providing connectivity solutions worldwide.

**Key Business Areas:**
- Fiber optic networks
- 5G infrastructure
- Satellite communications
- Internet services
- Network security

**Market Position:** Established telecommunications provider with strong infrastructure assets and growing presence in emerging markets.

**Recent Performance:** Moderate but consistent growth with stable revenue streams from infrastructure investments and expanding service offerings.`,
      customCards: [
        createStockInfoCard({
          title: 'Market Cap',
          value: '$890B',
          subtext: 'Global telecom leader',
          enabled: true,
        }),
        createStockInfoCard({
          title: 'Dividend Yield',
          value: '2.1%',
          subtext: 'Quarterly dividend payments',
          enabled: true,
        }),
      ],
    }),
  ],
  showBestYearCard: true,
  showWorstYearCard: true,
});
