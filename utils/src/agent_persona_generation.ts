import {AgentModelSettings} from './agent';

/** Types and prompt builders for AI-powered persona generation. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export type PersonaGenerationMode = 'generate' | 'embellish';

export interface PersonaGenerationRequest {
  mode: PersonaGenerationMode;
  currentText: string; // empty string for fresh generate
  modelSettings: AgentModelSettings;
}

export interface PersonaGenerationResult {
  text: string; // new text only (frontend appends for embellish)
}

// ************************************************************************* //
// PROMPT BUILDERS                                                           //
// ************************************************************************* //

/**
 * Builds the prompt for generating a fresh persona character sketch.
 *
 * Uses second-person "You are..." format — the standard for LLM agent system
 * prompts (Park et al. 2023, and conventions from LLM role-play research).
 * The output is used directly as a promptContext prepended to agent calls.
 */
export interface PersonaGenerationParams {
  age: number;
  pronouns: string;
  education: string;
  setting: string;
  big5: {
    openness: string;
    conscientiousness: string;
    extraversion: string;
    agreeableness: string;
    neuroticism: string;
  };
}

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
- Personality (Big Five scale 1-10):
  - Openness to experience: ${params.big5.openness}
  - Conscientiousness: ${params.big5.conscientiousness}
  - Extraversion: ${params.big5.extraversion}
  - Agreeableness: ${params.big5.agreeableness}
  - Neuroticism: ${params.big5.neuroticism}

Write a character sketch for this agent to use as its persona. The sketch must begin with "You are" and be written in second person throughout, as if directly addressing the AI agent — this text will be used verbatim as a system prompt.

Write in a clear, matter-of-fact, and realistic style (like a sociological profile or a background dossier). Avoid flowery prose, metaphors, or overly dramatic descriptions. Focus on concrete facts, specific attitudes, behavioral tendencies, and social dynamics that logically flow from the parameters above.

Cover all of the following dimensions:
- Who you are: name, age, occupation (must fit education level), location
- Personality: how the Big Five scores above manifest in your behavior
- Core values and beliefs: specific stances on social, political, or personal issues
- Motivations and goals: what drives you in daily life and in interactions
- Cognitive style: how you process information, your areas of knowledge, and your biases
- Emotional disposition: baseline affect and typical stress responses
- Social behavior: attitude toward authority, strangers, and group consensus
- Communication style: vocabulary, formality, and typical conversational habits

Keep it concise — aim for 200–250 words.

CRITICAL requirement: Your character must strictly adhere to the parameters provided above. Each sketch you write should feel completely unlike the last due to the random parameter combinations.

Write ONLY the character sketch text, starting directly with "You are". No preamble, no labels, no meta-commentary.`;
}

/**
 * Builds the prompt for embellishing an existing persona.
 *
 * Reads the existing sketch and appends a tightly-written addition that
 * deepens the persona — coherent with, never contradicting, what's there.
 */
export function buildEmbellishPersonaPrompt(currentText: string): string {
  return `You are helping refine an AI agent's persona. Here is its current character sketch:

---
${currentText}
---

Your task is to add 2-3 sentences (~50 words) that add concrete, factual detail to this persona.

You MUST identify the FIRST dimension in the priority list below that has not yet been covered in the current sketch, and generate content for ONLY that dimension. Do not jump to later dimensions until earlier ones are filled. If the current sketch is just a name (e.g., "You are Joe"), you must start with item 1.

Priority list of dimensions to cover:
1. Who you are: age, occupation, education, location
2. Personality: specific Big Five traits and how they manifest in behavior
3. Core values and beliefs: specific stances on social, political, or personal issues
4. Motivations and goals: what drives you in daily life and in interactions
5. Cognitive style: how you process information, your areas of knowledge, and your biases
6. Emotional disposition: baseline affect and typical stress responses
7. Social behavior: attitude toward authority, strangers, and group consensus
8. Communication style: vocabulary, formality, and typical conversational habits

Rules:
1. Never contradict anything already stated.
2. Keep the exact same second-person voice ("You...").
3. Write in a dry, factual, and clinical style (like a census report or a background check).
4. Do NOT use metaphors, similes, or poetic descriptions.
5. Do NOT add "flavor" details or cinematic quirks (e.g., coffee rings, working at 3:00 AM, sharpening knives). Focus only on hard facts and clear attitudes.
6. Do not summarize or repeat what's already written.
7. Do not use headers or bullet points.

Return ONLY the new sentences. Do not repeat or include the original text.`;
}
