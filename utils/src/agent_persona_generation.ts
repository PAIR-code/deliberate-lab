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
}

const VERBOSITY_DESCRIPTIONS: Record<number, string> = {
  1: 'extremely terse — single short sentences, often just a few words, never explains',
  2: 'brief — 1 to 2 sentences per turn, gets straight to the point',
  3: 'moderate — 2 to 3 sentences, adds some context when relevant',
  4: 'expansive — multiple sentences, elaborates and adds detail',
  5: 'verbose — long paragraph responses, rarely stops at the first thought',
};

/**
 * Builds the prompt for generating a fresh persona character sketch from scratch.
 * Uses random sampled params to force diversity.
 */
export function buildGeneratePersonaPrompt(
  params: PersonaGenerationParams,
): string {
  return `You are helping configure an AI research agent that will simulate a real human participant in an online study.

You MUST write a character sketch that fits the following randomly generated profile parameters. Do not ignore them or default to a standard profile.

Profile Parameters:
- Age: ${params.age}
- Pronouns: ${params.pronouns}
- Education level: ${params.education}
- Living environment: ${params.setting}
- Verbosity when communicating: ${params.verbosity}/5 — ${VERBOSITY_DESCRIPTIONS[params.verbosity]}
- Personality (Big Five scale 1-10):
  - Openness to experience: ${params.big5.openness}
  - Conscientiousness: ${params.big5.conscientiousness}
  - Extraversion: ${params.big5.extraversion}
  - Agreeableness: ${params.big5.agreeableness}
  - Neuroticism: ${params.big5.neuroticism}

Write a character sketch for this agent to use as its persona. The sketch must begin with "You are [Name]," and be written in second person throughout — this text will be used verbatim as a system prompt.

Write in a clear, matter-of-fact, and realistic style (like a sociological profile or a background dossier). Avoid flowery prose, metaphors, or overly dramatic descriptions. Focus on concrete facts, specific attitudes, behavioral tendencies, and social dynamics that logically flow from the parameters above.

Cover all of the following dimensions:
- Who you are: name, age, occupation (must fit education level), location
- Personality: how the Big Five scores above manifest in your behavior
- Core values and beliefs: specific stances on social, political, or personal issues
- Motivations and goals: what drives you in daily life and in interactions
- Cognitive style: how you process information, your areas of knowledge, and your biases
- Emotional disposition: baseline affect and typical stress responses
- Social behavior: attitude toward authority, strangers, and group consensus
- Communication style: vocabulary, formality, and verbosity consistent with the ${params.verbosity}/5 level above

Keep it concise — aim for 200–250 words.

CRITICAL requirement: Your character must strictly adhere to the parameters provided above. Each sketch you write should feel completely unlike the last due to the random parameter combinations.

Write ONLY the character sketch text, starting directly with "You are". No preamble, no labels, no meta-commentary.`;
}

/**
 * Builds the prompt for a merge-expand Generate when there is already text.
 * The LLM incorporates the existing text into a full ~250-word sketch.
 */
export function buildMergePersonaPrompt(
  existingText: string,
  params: PersonaGenerationParams,
): string {
  return `You are helping configure an AI research agent that will simulate a real human participant in an online study.

The experimenter has started writing a persona for this agent:
---
${existingText}
---

You MUST expand this into a complete character sketch, incorporating and staying consistent with everything already written above. Do not contradict or erase any existing details. Fill in what is missing using the randomly generated profile parameters below.

Profile Parameters (use these to fill in any missing dimensions — do NOT override what is already written):
- Age: ${params.age}
- Pronouns: ${params.pronouns}
- Education level: ${params.education}
- Living environment: ${params.setting}
- Verbosity when communicating: ${params.verbosity}/5 — ${VERBOSITY_DESCRIPTIONS[params.verbosity]}
- Personality (Big Five scale 1-10):
  - Openness to experience: ${params.big5.openness}
  - Conscientiousness: ${params.big5.conscientiousness}
  - Extraversion: ${params.big5.extraversion}
  - Agreeableness: ${params.big5.agreeableness}
  - Neuroticism: ${params.big5.neuroticism}

Write the full resulting character sketch in second person ("You are..."). Include all of the following dimensions:
- Who you are: name, age, occupation (must fit education level), location
- Personality: how the Big Five scores above manifest in your behavior
- Core values and beliefs: specific stances on social, political, or personal issues
- Motivations and goals
- Cognitive style and biases
- Emotional disposition
- Social behavior
- Communication style consistent with the verbosity level above

Write in a clear, matter-of-fact, and realistic style. Avoid flowery prose, metaphors, or dramatic descriptions. Keep it concise — aim for 200–250 words.

Write ONLY the character sketch text, starting directly with "You are". No preamble, no labels, no meta-commentary.`;
}

/**
 * Builds the prompt for enhancing an existing persona with episodic memories.
 *
 * Based on Concordia (DeepMind) research: specific episodic memories are the
 * most effective way to make LLM simulacra feel believable and human to other
 * participants, as they give the agent concrete experiences to draw on.
 */
export function buildEnhancePersonaPrompt(currentText: string): string {
  return `You are helping refine an AI agent's persona. Here is its current character sketch:

---
${currentText}
---

Add 1-2 short, specific episodic memories or personal experiences to this persona. These should be concrete past events or habits that this specific person would plausibly have, fully consistent with everything already stated.

Rules:
1. Never contradict anything already stated.
2. Keep the exact same second-person voice ("You...").
3. Be specific and concrete — a real event, habit, or experience, not a general trait.
4. Keep it brief — aim for 30-50 words total.
5. Do NOT use metaphors, flowery language, or cinematic quirks. Write plainly.
6. Do not summarize or repeat what's already written.
7. Do not use headers or bullet points.

Examples of good episodic additions:
- "You once filed a formal complaint against your supervisor for skipping safety protocol, which went nowhere."
- "You spent three years caring for your mother after her stroke before she passed."
- "You dropped out of a graduate program after the first semester when the funding fell through."

Return ONLY the new sentences. Do not repeat or include the original text.`;
}
