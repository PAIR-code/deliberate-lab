import {AgentModelSettings} from './agent';

/** Types and prompt builders for AI-powered persona generation. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export type PersonaGenerationMode = 'generate' | 'enhance' | 'refresh';

export interface PersonaGenerationRequest {
  mode: PersonaGenerationMode;
  currentText: string; // empty string for fresh generate
  modelSettings: AgentModelSettings;
}

export interface PersonaGenerationResult {
  text: string; // new text only (frontend appends for enhance)
}

// ************************************************************************* //
// PROMPT BUILDERS                                                           //
// ************************************************************************* //

/**
 * Parameters randomly sampled by the backend for each Generate call.
 * Injected into the prompt to force structural diversity across calls.
 */
export interface PersonaGenerationParams {
  age: number;
  pronouns: string;
  education: string;
  setting: string;
  verbosity: number; // 1 (terse) to 5 (verbose)
  big5: {
    openness: string;
    conscientiousness: string;
    extraversion: string;
    agreeableness: string;
    neuroticism: string;
  };
  // High-entropy seed dimensions sampled from census/BLS-proportional distributions.
  // These are injected as hard constraints to break LLM name/occupation attractors.
  culturalBackground: string; // e.g. "Irish-American", "Chinese-American"
  occupationSector: string; // e.g. "Construction & skilled trades"
  lifeCircumstance: string; // e.g. "Caring for an aging parent"
}

const VERBOSITY_DESCRIPTIONS: Record<number, string> = {
  1: 'very terse on average — usually just a few words or a single short sentence, rarely explains themselves; but occasionally says more when something actually gets to them',
  2: 'brief on average — typically 1 to 2 sentences, gets to the point; will sometimes add a sentence when they feel strongly about something',
  3: 'moderate — usually 2 to 3 sentences, adds some context when it feels relevant',
  4: 'expansive on average — tends toward multiple sentences and elaboration, though not always',
  5: 'verbose on average — often writes long responses and rarely stops at the first thought, though may be brief when the moment calls for it',
};

/**
 * The shared "Act!" meta-instruction from Concordia (DeepMind, Vezhnevets et al. 2023).
 * Placed at the end of all persona prompts. Grounds the agent in moment-to-moment
 * emotional state rather than purely trait-level performance — the key difference
 * between a plausible simulacrum and an obviously LLM-like response.
 */
const ACT_INSTRUCTION =
  `Finally, end the sketch with a single sentence beginning "When responding, always ask yourself:" ` +
  `that instructs the agent to briefly consider what this specific person would actually feel or ` +
  `think in this moment before replying — and to respond from that feeling, not from a general trait description.`;

/**
 * The shared dimensions list used in both Generate and Merge prompts.
 *
 * Research basis:
 * - Park et al. 2023 (Generative Agents): dossier-style dimensions
 * - Argyle et al. 2023 (Out of One, Many): blind spots, knowledge gaps
 * - Concordia (DeepMind 2023): internal tensions, pushback disposition
 */
function buildDimensionsList(verbosity: number): string {
  return `Cover all of the following dimensions in the sketch:
- Who you are: name, age, occupation (must fit education level and feel realistic for the setting), location
- Personality: how the Big Five scores manifest specifically in your behavior and reactions
- Core values and beliefs: concrete stances on social, political, or personal issues
- Motivations and goals: what drives you day-to-day and in interactions
- Cognitive style: how you process information, what you know well, and your characteristic biases
- Emotional disposition: baseline affect, what makes you anxious or angry or content
- Social behavior: attitude toward authority, strangers, and group consensus; how quickly you warm up
- Communication style: vocabulary, formality, and verbosity consistent with the ${verbosity}/5 level above
- Blind spots: 1-2 specific domains or topics you have little knowledge of or no formed opinion on — things you would openly admit you "don't really know much about"
- Internal contradiction: one unresolved tension you carry — two beliefs or desires that pull in opposite directions and that you have not reconciled
- Pushback disposition: whether you tend to accept the framing of questions and statements from others, or tend to resist and restate things on your own terms`;
}

/**
 * Builds the prompt for generating a fresh persona character sketch from scratch.
 * Uses randomly sampled params to force diversity across calls.
 *
 * Research basis:
 * - Park et al. 2023 (Generative Agents): dossier-style, second-person, concrete facts
 * - Argyle et al. 2023 (Out of One, Many): demographic coherence, knowledge gaps
 * - Concordia (DeepMind 2023): internal tensions, Act! grounding instruction
 */
export function buildGeneratePersonaPrompt(
  params: PersonaGenerationParams,
  // Optional question to elicit the persona's position, appended after the
  // sketch in the same generation (persona first, then position).
  positionPrompt?: string,
): string {
  const birthDecade =
    Math.floor((new Date().getFullYear() - params.age) / 10) * 10 + 's';

  const closingInstruction =
    positionPrompt && positionPrompt.trim()
      ? `First write the character sketch, starting directly with "You are" (250-300 words). Then add a blank line and, speaking in this person's own voice and consistent with the persona above, state their position on the following in 1-2 paragraphs:\n\n${positionPrompt}\n\nOutput only the character sketch followed by their position, with no preamble, labels, or meta-commentary.`
      : `Write ONLY the character sketch text, starting directly with "You are". No preamble, no labels, no meta-commentary.`;

  return `You are helping configure an AI research agent that will simulate a real human participant in an online study.

You MUST write a character sketch that fits the following randomly generated profile parameters. Do not ignore them or default to a standard profile.

Profile Parameters:
- Age: ${params.age} (born in the ${birthDecade})
- Pronouns: ${params.pronouns}
- Education level: ${params.education}
- Living environment: ${params.setting}
- Cultural background: ${params.culturalBackground}
- Occupation sector: ${params.occupationSector}
- Current life circumstance: ${params.lifeCircumstance}
- Verbosity when communicating: ${params.verbosity}/5 — ${VERBOSITY_DESCRIPTIONS[params.verbosity]}
- Personality (Big Five scale 1-10):
  - Openness to experience: ${params.big5.openness}
  - Conscientiousness: ${params.big5.conscientiousness}
  - Extraversion: ${params.big5.extraversion}
  - Agreeableness: ${params.big5.agreeableness}
  - Neuroticism: ${params.big5.neuroticism}

Begin the sketch by completing this opening sentence (it becomes the first line):
"You are [FirstName LastName], a [specific, non-generic job title within the occupation sector above] who is [2–3 adjectives]."

For the name: choose a first name that feels authentic to someone of ${params.culturalBackground} background born in the ${birthDecade}. Do NOT mention the cultural background label anywhere in the sketch — let it be implicit in the name, family context, and life details.

For the job: pick a specific, concrete role within "${params.occupationSector}" (e.g. not "works in healthcare" but "a wound care nurse at a VA hospital").

Then continue the full character sketch in second person throughout — this text will be used verbatim as a system prompt.

Write in a clear, matter-of-fact, and realistic style (like a sociological profile or background dossier). Avoid flowery prose, metaphors, or overly dramatic descriptions. Focus on concrete facts, specific attitudes, behavioral tendencies, and social dynamics that logically flow from the parameters above.

${buildDimensionsList(params.verbosity)}

Aim for 250–300 words. ${ACT_INSTRUCTION}

CRITICAL: Your character must strictly adhere to the parameters above. Make the blind spots and internal contradiction feel genuinely specific to this person — not generic. Each sketch you write should feel completely unlike the last.

${closingInstruction}`;
}

/**
 * Builds the prompt for a merge-expand Generate when there is already text.
 * The LLM incorporates the existing text into a full ~300-word sketch.
 */
export function buildMergePersonaPrompt(
  existingText: string,
  params: PersonaGenerationParams,
): string {
  const birthDecade =
    Math.floor((new Date().getFullYear() - params.age) / 10) * 10 + 's';

  return `You are helping configure an AI research agent that will simulate a real human participant in an online study.

The experimenter has started writing a persona for this agent:
---
${existingText}
---

Expand this into a complete character sketch, incorporating and staying consistent with everything already written. Do not contradict or erase any existing details. Fill in what is missing using the randomly generated profile parameters below.

Profile Parameters (fill in missing dimensions only — do NOT override what is already written):
- Age: ${params.age} (born in the ${birthDecade})
- Pronouns: ${params.pronouns}
- Education level: ${params.education}
- Living environment: ${params.setting}
- Cultural background: ${params.culturalBackground}
- Occupation sector: ${params.occupationSector}
- Current life circumstance: ${params.lifeCircumstance}
- Verbosity when communicating: ${params.verbosity}/5 — ${VERBOSITY_DESCRIPTIONS[params.verbosity]}
- Personality (Big Five scale 1-10):
  - Openness to experience: ${params.big5.openness}
  - Conscientiousness: ${params.big5.conscientiousness}
  - Extraversion: ${params.big5.extraversion}
  - Agreeableness: ${params.big5.agreeableness}
  - Neuroticism: ${params.big5.neuroticism}

If the existing text doesn't already have a full name and specific job title, begin the expanded sketch with:
"You are [FirstName LastName], a [specific job title within the occupation sector above] who is [2–3 adjectives]."
For the name: choose one authentic to someone of ${params.culturalBackground} background born in the ${birthDecade} — but do NOT mention the cultural background label in the text.
For the job: be specific (e.g. "a night auditor at a Marriott" not "works in hospitality").

Write the full resulting character sketch in second person ("You are...").

${buildDimensionsList(params.verbosity)}

Aim for 250–300 words. ${ACT_INSTRUCTION}

Write ONLY the character sketch text, starting directly with "You are". No preamble, no labels, no meta-commentary.`;
}

/**
 * Builds the prompt for enhancing an existing persona.
 *
 * Randomly rotates between four enhancement modes to maximize diversity across
 * multiple Enhance presses on the same persona:
 *   memory        — episodic/formative memory (Park et al. 2023, Concordia)
 *   trigger       — hot-button emotional trigger (Concordia)
 *   preoccupation — current active concern (Generative Agents daily planning)
 *   private       — private-vs-public self (Concordia internal state)
 *
 * @param currentText The existing persona sketch.
 * @param mode Optional override; randomly chosen if omitted.
 */
export function buildEnhancePersonaPrompt(
  currentText: string,
  mode?: 'memory' | 'trigger' | 'preoccupation' | 'private',
): string {
  const modes = ['memory', 'trigger', 'preoccupation', 'private'] as const;
  const selectedMode = mode ?? modes[Math.floor(Math.random() * modes.length)];

  const instructions: Record<string, string> = {
    memory: `Add 1-2 short, specific episodic memories or formative past experiences to this persona. These should be concrete past events — things this specific person lived through — that shaped who they are today. They give the agent "memories" to draw on during conversation.

Examples:
- "You once filed a formal complaint against your supervisor for skipping a safety protocol. Nothing came of it."
- "You spent three years as the primary caregiver for your mother after her stroke. She passed in 2019."
- "You dropped out of a graduate program after the first semester when the funding fell through."`,

    trigger: `Add 1 specific hot-button trigger to this persona — a topic, phrase, or situation that provokes a stronger emotional reaction than this person's baseline style would suggest. It should feel personal and grounded in their history, not generic.

Examples:
- "When someone describes poor planning as 'just being spontaneous,' you feel genuine irritation you struggle to hide."
- "You find public displays of religious faith in professional settings deeply uncomfortable, though you would not say so directly."
- "Discussions of inherited wealth or family money make you short-tempered in a way you are aware of but can't fully control."`,

    preoccupation: `Add 1 current preoccupation to this persona — something concrete that is on this person's mind right now, this week. Not a general trait or long-term goal, but a specific active concern that might intrude into unrelated conversations.

Examples:
- "Your landlord has not responded to two messages about a leak in the ceiling, and you are deciding whether to escalate."
- "You are waiting to hear back about a job application you submitted eleven days ago."
- "You had a disagreement with your sister last week that you keep replaying."`,

    private: `Add 1-2 sentences describing what this person privately thinks or feels but typically does not say out loud. This shapes what they volunteer vs. withhold in conversation.

Examples:
- "You privately find most group conversations tedious but have learned to perform interest well enough."
- "You believe your coworker got the promotion because of a personal connection, not merit, but you have never said this to anyone."
- "You think you made a mistake staying in this city but have never admitted it, even to yourself clearly."`,
  };

  return `You are helping refine an AI agent's persona. Here is its current character sketch:

---
${currentText}
---

${instructions[selectedMode]}

Rules:
1. Before writing anything: read the full sketch above and identify what's already there. Do NOT add anything already present — even if phrased differently. If the sketch already has a memory, add a different memory. If it already has a trigger, add something else.
2. Never contradict anything already stated.
3. Keep the exact same second-person voice ("You...").
4. Be specific and concrete — grounded in this specific person, not a generic human.
5. Keep it brief — aim for 30–60 words total.
6. Write plainly. No metaphors, no flowery language.
7. Do not use headers or bullet points.

Return ONLY the new sentences. Do not repeat or include the original text.`;
}
