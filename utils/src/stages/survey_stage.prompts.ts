import { 
    BaseSurveyQuestion, 
    CheckSurveyQuestion, 
    MultipleChoiceSurveyQuestion, 
    ScaleSurveyQuestion, 
    SurveyQuestionKind, 
    TextSurveyQuestion } from "./survey_stage";

/**
 * Determines the appropriate prompt format for a given survey question.
 * @param {BaseSurveyQuestion} question - A survey question object.
 * @returns {string} - The formatted question prompt.
 */
export function createQuestionPrompt(question: BaseSurveyQuestion): string {
    switch (question.kind) {
        case SurveyQuestionKind.TEXT:
            return _createTextQuestionPrompt(question as TextSurveyQuestion);
        case SurveyQuestionKind.CHECK:
            return _createCheckQuestionPrompt(question as CheckSurveyQuestion);
        case SurveyQuestionKind.MULTIPLE_CHOICE:
            return _createMultipleChoiceQuestionPrompt(question as MultipleChoiceSurveyQuestion);
        case SurveyQuestionKind.SCALE:
            return _createScaleQuestionPrompt(question as ScaleSurveyQuestion);
        default:
            console.error(`Unknown survey question type: ${question.kind}`);
            return "";
    }
}

export function _createTextQuestionPrompt(question: TextSurveyQuestion): string {
    return `Answer the following question freely: ${question.questionTitle}`;
}

export function _createCheckQuestionPrompt(question: CheckSurveyQuestion): string {
    return `Answer the following question with "yes" or "no": ${question.questionTitle}`;
}

export function _createMultipleChoiceQuestionPrompt(question: MultipleChoiceSurveyQuestion): string {
    let prompt = `Multiple Choice Question: ${question.questionTitle}\n Options: \n`;
    for (let i in question.options) {
        const option = question.options[i].text
        prompt += `${i}. ${option}\n`;
    }
    prompt += "Select one or more of the options above."

    return prompt;
}

export function _createScaleQuestionPrompt(question: ScaleSurveyQuestion): string {
    return `How much do you agree with the following statement: ${question.questionTitle}, 
    from a scale of ${question.lowerValue} (${question.lowerText}) to ${question.upperValue} (${question.upperText})?`;
}