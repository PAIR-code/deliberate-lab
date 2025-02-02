import { 
    BaseSurveyQuestion, 
    CheckSurveyQuestion, 
    MultipleChoiceSurveyQuestion, 
    ScaleSurveyQuestion, 
    SurveyQuestionKind, 
    TextSurveyQuestion } from "./survey_stage";


/**
 * Generates a full prompt to be given to an LLM agent for a given set of survey questions.
 * @param {BaseSurveyQuestion[]} questions - An array of survey questions.
 * @returns {string} - A prompt describing the entire survey.
 */
export function createAgentParticipantSurveyStagePrompt(questions: BaseSurveyQuestion[]): string {
    let fullPrompt = "";
    for (let question of questions) {
        fullPrompt += createQuestionPrompt(question);
    }
    return fullPrompt;
}

/**
 * Determines the appropriate prompt format for a given survey question.
 * @param {BaseSurveyQuestion} question - A survey question object.
 * @returns {string} - The formatted question prompt.
 */
function createQuestionPrompt(question: BaseSurveyQuestion): string {
    switch (question.kind) {
        case SurveyQuestionKind.TEXT:
            return createTextQuestionPrompt(question as TextSurveyQuestion);
        case SurveyQuestionKind.CHECK:
            return createCheckQuestionPrompt(question as CheckSurveyQuestion);
        case SurveyQuestionKind.MULTIPLE_CHOICE:
            return createMultipleChoiceQuestionPrompt(question as MultipleChoiceSurveyQuestion);
        case SurveyQuestionKind.SCALE:
            return createScaleQuestionPrompt(question as ScaleSurveyQuestion);
        default:
            console.error(`Unknown survey question type: ${question.kind}`);
            return "";
    }
}

function createTextQuestionPrompt(question: TextSurveyQuestion): string {
    return `Answer freely: ${question.questionTitle}`;
}

function createCheckQuestionPrompt(question: CheckSurveyQuestion): string {
    return `Answer with True/False: ${question.questionTitle}`;
}

function createMultipleChoiceQuestionPrompt(question: MultipleChoiceSurveyQuestion): string {
    let prompt = `Multiple Choice Question: ${question.questionTitle}\n Options: \n`;
    for (let i in question.options) {
        const option = question.options[i]
        prompt += `${i}. ${option}\n`;
    }
    prompt += "Select one or more of the options above."

    return prompt;
}

function createScaleQuestionPrompt(question: ScaleSurveyQuestion): string {
    return `How much do you agree with the following statement: ${question.questionTitle}, 
    from a scale of ${question.lowerValue} (${question.lowerText}) to ${question.upperValue} (${question.upperText})?`;
}
