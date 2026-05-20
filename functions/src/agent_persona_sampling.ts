import {PersonaGenerationParams} from '@deliberation-lab/utils';

/**
 * Persona parameter sampling for AI simulacra generation.
 *
 * All sampling logic lives here, separate from the Firebase endpoint handler.
 * Call samplePersonaParams() to get a fully populated PersonaGenerationParams
 * ready to pass to buildGeneratePersonaPrompt / buildMergePersonaPrompt.
 *
 * Research basis for distributions:
 *   - Difallah et al. 2018: MTurk workers are ~60% female, heavily 25–44
 *   - Peer et al. 2017: Prolific skews 18–35, more educated than MTurk
 *   - Ipeirotis 2010: MTurk modal age 25–34, ~10% over 50
 *   - Pew Research 2023: internet penetration drops steeply after 65
 *   - US Census 2020: race/ethnicity proportions
 *   - BLS OES 2023: occupation sector employment shares
 */

// ============================================================================
// QUASI-RANDOM SAMPLING (Halton sequence)
//
// Big Five traits are sampled via a Halton low-discrepancy sequence rather than
// independent Math.random() calls. Independent draws have no memory between
// calls, so N generates can accidentally cluster — e.g. three agents all
// scoring 5-7 on every trait. The Halton sequence is deterministic: each new
// index fills the *largest gap* left by prior samples, so any contiguous slice
// of the sequence is evenly spread across [0, 1).
//
// Each trait uses a different prime base so the five dimensions are
// mathematically uncorrelated — coprime bases are guaranteed incommensurable,
// meaning no two traits will accidentally move in lockstep.
//
// Motivation: Paglieri et al. 2026 (arXiv:2602.03545) found that quasi-random
// Monte Carlo sampling in Stage 1 of their persona generator consistently
// outperformed independent random draws on all six diversity metrics.
// Sequence math: Halton 1960 (Numerische Mathematik 2, 84–90).
// ============================================================================

/**
 * Returns the n-th term of the Halton sequence in the given base.
 * Result is in [0, 1). n=0 returns 0; n=1 returns 1/base; etc.
 */
function halton(n: number, base: number): number {
  let result = 0;
  let f = 1;
  let i = n;
  while (i > 0) {
    f /= base;
    result += f * (i % base);
    i = Math.floor(i / base);
  }
  return result;
}

/**
 * Maps a Halton value to a Big Five score string on the 1–10 scale.
 * halton() returns [0, 1), so Math.floor(h * 10) gives 0–9; +1 → 1–10.
 */
function haltonBig5Score(n: number, base: number): string {
  const score = Math.floor(halton(n, base) * 10) + 1;
  return `${score}/10`;
}

// ============================================================================
// TYPES
// ============================================================================

interface WeightedItem {
  label: string;
  weight: number;
}

interface Archetype {
  label: string;
  ageMin: number;
  ageMax: number;
  educationWeights: WeightedItem[];
  settingWeights: WeightedItem[];
}

// ============================================================================
// HELPER
// ============================================================================

/** Weighted random pick. Falls back to last item if weights don't sum to 1. */
function weightedPick(items: WeightedItem[]): string {
  const r = Math.random();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (r < cumulative) return item.label;
  }
  return items[items.length - 1].label;
}

// ============================================================================
// LIFE-STAGE ARCHETYPES
// Crowd-worker calibrated: College student 20%, Young professional 35%,
// Mid-career 30%, Older adult 15%.
// Age, education, and setting are drawn jointly to avoid incoherent combos
// (e.g. 18-year-olds with PhDs, 80-year-olds on Prolific).
// ============================================================================

const ARCHETYPES: {archetype: Archetype; weight: number}[] = [
  {
    weight: 0.2,
    archetype: {
      label: 'College student / early adult',
      ageMin: 18,
      ageMax: 24,
      educationWeights: [
        {label: 'High school diploma', weight: 0.2},
        {label: "Some college or Associate's degree", weight: 0.5},
        {label: "Bachelor's degree", weight: 0.3},
      ],
      settingWeights: [
        {label: 'Urban', weight: 0.45},
        {label: 'Suburban', weight: 0.35},
        {label: 'Rural', weight: 0.15},
        {label: 'Remote/Isolated', weight: 0.05},
      ],
    },
  },
  {
    weight: 0.35,
    archetype: {
      label: 'Young professional / gig worker',
      ageMin: 25,
      ageMax: 38,
      educationWeights: [
        {label: 'High school diploma', weight: 0.1},
        {label: "Some college or Associate's degree", weight: 0.25},
        {label: "Bachelor's degree", weight: 0.45},
        {label: "Master's degree", weight: 0.18},
        {label: 'Doctorate or Professional degree', weight: 0.02},
      ],
      settingWeights: [
        {label: 'Urban', weight: 0.4},
        {label: 'Suburban', weight: 0.4},
        {label: 'Rural', weight: 0.12},
        {label: 'Remote/Isolated', weight: 0.08},
      ],
    },
  },
  {
    weight: 0.3,
    archetype: {
      label: 'Mid-career / family stage',
      ageMin: 39,
      ageMax: 55,
      educationWeights: [
        {label: 'No high school diploma', weight: 0.05},
        {label: 'High school diploma', weight: 0.2},
        {label: "Some college or Associate's degree", weight: 0.3},
        {label: "Bachelor's degree", weight: 0.3},
        {label: "Master's degree", weight: 0.12},
        {label: 'Doctorate or Professional degree', weight: 0.03},
      ],
      settingWeights: [
        {label: 'Urban', weight: 0.25},
        {label: 'Suburban', weight: 0.5},
        {label: 'Rural', weight: 0.2},
        {label: 'Remote/Isolated', weight: 0.05},
      ],
    },
  },
  {
    weight: 0.15,
    archetype: {
      label: 'Older adult / pre-retirement',
      ageMin: 56,
      ageMax: 75,
      educationWeights: [
        {label: 'No high school diploma', weight: 0.08},
        {label: 'High school diploma', weight: 0.3},
        {label: "Some college or Associate's degree", weight: 0.3},
        {label: "Bachelor's degree", weight: 0.22},
        {label: "Master's degree", weight: 0.08},
        {label: 'Doctorate or Professional degree', weight: 0.02},
      ],
      settingWeights: [
        {label: 'Urban', weight: 0.2},
        {label: 'Suburban', weight: 0.45},
        {label: 'Rural', weight: 0.3},
        {label: 'Remote/Isolated', weight: 0.05},
      ],
    },
  },
];

// ============================================================================
// CULTURAL BACKGROUNDS
// US Census 2020 race/ethnicity proportions.
// Used IMPLICITLY: shapes name choice and family/community context.
// The label is never stated in the output persona text.
// ~45 distinct backgrounds → ~45× name-space expansion.
// ============================================================================

const CULTURAL_BACKGROUNDS: WeightedItem[] = [
  // White non-Hispanic (~58%)
  {label: 'Generic/mixed white American', weight: 0.09},
  {label: 'German-American', weight: 0.08},
  {label: 'Irish-American', weight: 0.07},
  {label: 'English/British-American', weight: 0.06},
  {label: 'Appalachian/Scots-Irish', weight: 0.04},
  {
    label: 'Scandinavian-American (Norwegian, Swedish, Danish, or Finnish)',
    weight: 0.04,
  },
  {label: 'Italian-American', weight: 0.04},
  {label: 'French-American / Cajun-Creole', weight: 0.025},
  {label: 'Jewish (Ashkenazi)', weight: 0.02},
  {label: 'Polish-American', weight: 0.02},
  {label: 'Czech or Slovak-American', weight: 0.01},
  {label: 'Russian or Ukrainian-American', weight: 0.01},
  {label: 'Portuguese-American', weight: 0.008},
  {label: 'Greek-American', weight: 0.007},
  {label: 'Dutch-American', weight: 0.005},
  {label: 'Armenian-American', weight: 0.003},
  // Hispanic/Latino (~19%)
  {label: 'Mexican-American', weight: 0.11},
  {label: 'Puerto Rican', weight: 0.015},
  {label: 'Other Latin American', weight: 0.015},
  {label: 'Cuban-American', weight: 0.007},
  {label: 'Salvadoran-American', weight: 0.007},
  {label: 'Dominican', weight: 0.006},
  {label: 'Colombian-American', weight: 0.005},
  {label: 'Guatemalan-American', weight: 0.005},
  {label: 'Honduran-American', weight: 0.003},
  {label: 'Venezuelan-American', weight: 0.003},
  // Black/African American (~12%)
  {label: 'African American (multi-generational, US South)', weight: 0.05},
  {label: 'African American (Northern or Midwest urban)', weight: 0.03},
  {label: 'Nigerian-American', weight: 0.006},
  {label: 'Haitian-American', weight: 0.005},
  {label: 'Jamaican or Caribbean-American', weight: 0.005},
  {label: 'Ethiopian-American', weight: 0.004},
  {label: 'Ghanaian-American', weight: 0.003},
  {label: 'Somali-American', weight: 0.002},
  {label: 'Other Afro-Caribbean', weight: 0.003},
  {label: 'Other African', weight: 0.003},
  // Asian (~6%)
  {label: 'Chinese-American', weight: 0.015},
  {label: 'Indian-American', weight: 0.013},
  {label: 'Filipino-American', weight: 0.009},
  {label: 'Vietnamese-American', weight: 0.006},
  {label: 'Korean-American', weight: 0.005},
  {label: 'Japanese-American', weight: 0.004},
  {label: 'Pakistani-American', weight: 0.002},
  {label: 'Hmong-American', weight: 0.001},
  {label: 'Cambodian-American', weight: 0.001},
  {label: 'Thai-American', weight: 0.001},
  // Other (~5%)
  {label: 'Mixed or multiracial', weight: 0.03},
  {
    label: 'Arab-American (Lebanese, Syrian, Egyptian, Yemeni, or other)',
    weight: 0.006,
  },
  {label: 'Native American or Alaska Native', weight: 0.006},
  {label: 'Iranian-American', weight: 0.002},
  {label: 'Pacific Islander-American', weight: 0.002},
  {label: 'Turkish-American', weight: 0.001},
  {label: 'Afghan-American', weight: 0.001},
];

// ============================================================================
// OCCUPATION SECTORS
// BLS OES 2023 employment shares.
// LLM picks a specific, non-generic job title within the sector
// (e.g. "wound care nurse at a VA hospital" not "works in healthcare").
// ~22 sectors.
// ============================================================================

const OCCUPATION_SECTORS: WeightedItem[] = [
  {label: 'Office & administrative support', weight: 0.13},
  {label: 'Retail & customer service', weight: 0.11},
  {label: 'Food service & hospitality', weight: 0.09},
  {label: 'Education (K-12, higher ed, or tutoring)', weight: 0.09},
  {label: 'Healthcare practitioners & nursing', weight: 0.08},
  {label: 'Management & business operations', weight: 0.08},
  {label: 'Transportation & logistics', weight: 0.08},
  {label: 'Manufacturing & production', weight: 0.07},
  {label: 'Healthcare support & aides', weight: 0.06},
  {label: 'Construction & skilled trades', weight: 0.05},
  {label: 'Government & public safety', weight: 0.05},
  {
    label: 'Professional services (legal, accounting, or consulting)',
    weight: 0.04,
  },
  {label: 'Technology & IT', weight: 0.04},
  {label: 'Personal services (beauty, childcare, or cleaning)', weight: 0.04},
  {label: 'Finance & insurance', weight: 0.03},
  {label: 'Self-employed, freelance, or gig work', weight: 0.03},
  {
    label:
      'Not currently employed (student, full-time caregiver, or job-seeking)',
    weight: 0.03,
  },
  {label: 'Social services & nonprofits', weight: 0.02},
  {label: 'Arts, entertainment & media', weight: 0.02},
  {label: 'Agriculture, farming, forestry, or fishing', weight: 0.015},
  {label: 'Real estate & property management', weight: 0.015},
  {label: 'Military or recently separated veteran', weight: 0.005},
];

// ============================================================================
// LIFE CIRCUMSTANCES
// Approximate Pew/Gallup/Census prevalence.
// One concrete current-life fact — makes the persona "present" and grounded.
// ~30 circumstances.
// ============================================================================

const LIFE_CIRCUMSTANCES: WeightedItem[] = [
  {label: 'Dealing with significant financial stress or debt', weight: 0.08},
  {label: 'Raising young children (under 10)', weight: 0.08},
  {label: 'Struggling with a difficult boss or coworker', weight: 0.05},
  {label: 'Caring for an aging or sick parent', weight: 0.05},
  {label: 'Active in a religious or faith community', weight: 0.05},
  {
    label: 'Dealing with housing cost pressure (rent or mortgage)',
    weight: 0.04,
  },
  {label: 'Recently changed jobs or careers', weight: 0.04},
  {
    label: 'Trying to get healthier (fitness, diet, or quitting something)',
    weight: 0.04,
  },
  {label: 'Considering a significant career change', weight: 0.04},
  {label: 'Recently moved to a new city or neighborhood', weight: 0.04},
  {label: 'Managing a chronic health condition', weight: 0.04},
  {
    label: 'Newly in a long-term relationship or recently married',
    weight: 0.03,
  },
  {label: 'Dealing with a difficult divorce or separation', weight: 0.03},
  {label: 'Recently promoted or given new responsibilities', weight: 0.03},
  {
    label: 'Planning a major purchase (house, car, or renovation)',
    weight: 0.03,
  },
  {label: 'Going back to school or taking classes part-time', weight: 0.03},
  {label: 'Recovering from an injury or medical procedure', weight: 0.03},
  {label: 'Caring for a sick or disabled family member', weight: 0.03},
  {label: 'Recently lost a close family member', weight: 0.02},
  {label: 'Living alone for the first time', weight: 0.02},
  {label: 'Newly empty-nester (children just left home)', weight: 0.02},
  {label: 'Recently laid off or let go', weight: 0.02},
  {label: 'Planning retirement in the next few years', weight: 0.02},
  {label: 'Dealing with social isolation or loneliness', weight: 0.02},
  {label: 'Just had a first child', weight: 0.015},
  {
    label: 'Recently got a significant raise or financial windfall',
    weight: 0.015,
  },
  {
    label: 'Deeply invested in a personal hobby or community project',
    weight: 0.015,
  },
  {label: 'Going through a major spiritual or values shift', weight: 0.01},
  {label: 'Navigating an immigration or citizenship process', weight: 0.01},
  {label: 'Recovering from addiction', weight: 0.01},
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Samples a fully populated PersonaGenerationParams object.
 *
 * Demographic dimensions (age, education, setting) are drawn jointly from a
 * life-stage archetype to avoid incoherent combinations. Cultural background,
 * occupation sector, and life circumstance are sampled independently from
 * census/BLS-proportional distributions to maximize name and persona diversity.
 *
 * @param batchIndex - Optional. Pass 0, 1, 2, ... for successive generates
 *   within a session. Used as the Halton sequence index for Big Five sampling,
 *   so each new agent fills the biggest gap in the joint trait space left by
 *   previous ones. Omit for a random offset (good for isolated single calls).
 */
export function samplePersonaParams(
  batchIndex?: number,
): PersonaGenerationParams {
  // Halton index: sequential when batchIndex is provided (guarantees spread
  // across a session); random prime-offset fallback for isolated calls.
  // 997 is prime — avoids period aliasing with the sequence bases.
  const haltonIndex = batchIndex ?? Math.floor(Math.random() * 997);
  // 1. Pick life-stage archetype (correlated: age + education + setting)
  const archetypeRand = Math.random();
  let cumulative = 0;
  let selectedArchetype = ARCHETYPES[0].archetype;
  for (const {weight, archetype} of ARCHETYPES) {
    cumulative += weight;
    if (archetypeRand < cumulative) {
      selectedArchetype = archetype;
      break;
    }
  }

  // 2. Age — uniform within archetype range
  const age =
    Math.floor(
      Math.random() * (selectedArchetype.ageMax - selectedArchetype.ageMin + 1),
    ) + selectedArchetype.ageMin;

  // 3. Pronouns — crowd worker populations skew ~55% female (Difallah 2018)
  const pronounsRand = Math.random();
  let pronouns = 'she/her';
  if (pronounsRand < 0.55) {
    pronouns = 'she/her';
  } else if (pronounsRand < 0.97) {
    pronouns = 'he/him';
  } else {
    pronouns = 'they/them';
  }

  // 4. Education — correlated with archetype
  const education = weightedPick(selectedArchetype.educationWeights);

  // 5. Setting — correlated with archetype
  const setting = weightedPick(selectedArchetype.settingWeights);

  // 6. Big Five — quasi-random Halton sampling (Halton 1960; Paglieri et al. 2026)
  // Prime bases keep the five dimensions mathematically uncorrelated.
  //   Openness:          base 2
  //   Conscientiousness: base 3
  //   Extraversion:      base 5
  //   Agreeableness:     base 7
  //   Neuroticism:       base 11
  const big5 = {
    openness: haltonBig5Score(haltonIndex, 2),
    conscientiousness: haltonBig5Score(haltonIndex, 3),
    extraversion: haltonBig5Score(haltonIndex, 5),
    agreeableness: haltonBig5Score(haltonIndex, 7),
    neuroticism: haltonBig5Score(haltonIndex, 11),
  };

  // 7. Verbosity — 1–5, uniform
  const verbosity = Math.ceil(Math.random() * 5);

  // 8. Cultural background — US Census 2020 proportional (implicit in output)
  const culturalBackground = weightedPick(CULTURAL_BACKGROUNDS);

  // 9. Occupation sector — BLS OES 2023 proportional
  const occupationSector = weightedPick(OCCUPATION_SECTORS);

  // 10. Life circumstance — Pew/Gallup/Census approximate prevalence
  const lifeCircumstance = weightedPick(LIFE_CIRCUMSTANCES);

  return {
    age,
    pronouns,
    education,
    setting,
    big5,
    verbosity,
    culturalBackground,
    occupationSector,
    lifeCircumstance,
  };
}
