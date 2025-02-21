import {
    SurveyStageConfig,
    ExperimenterData,
    ParticipantProfileExtended,
    createSurveyQuestionPrompt,
    BaseSurveyAnswer,
    SurveyQuestionKind,
    INVALID_ANSWER,
    TextSurveyAnswer,
    CheckSurveyAnswer,
    ScaleSurveyAnswer,
    MultipleChoiceSurveyAnswer,
    SurveyQuestion,
    MultipleChoiceSurveyQuestion,
    ScaleSurveyQuestion,
} from "@deliberation-lab/utils";
import { getAgentResponse } from '../agent.utils';


/**
 * Ask an LLM actor to fill out each field in a survey.
 * @param experimentId The current experiment ID
 * @param experimenterData The ExperimenterData object for communicating with the LLM agent
 * @param participant Participant profile information (used for debug messages only)
 * @param stage The current Survey stage configuration object, containing the survey questions
 * @returns A list of answers for each of the survey questions
 */
export async function getAgentParticipantSurveyResponse(
    experimentId: string,
    experimenterData: ExperimenterData, // for making LLM call
    participant: ParticipantProfileExtended,
    stage: SurveyStageConfig): Promise<BaseSurveyAnswer[]> {

    console.debug(
        'TESTING AGENT PARTICIPANT PROMPT FOR RANKING STAGE\n',
        `Experiment: ${experimentId}\n`,
        `Participant: ${participant.publicId}\n`,
        `Stage: ${stage.name} (${stage.kind})\n`);

    const answers: BaseSurveyAnswer[] = [];

    // Build prompt
    for (let question of stage.questions) {
        const llmResponse = await getLLMResponse(experimenterData, question);

        const formattedResponse = formatAnswer(question, llmResponse);
        if (!formattedResponse) {
            answers.push(INVALID_ANSWER);
        } else {
            answers.push(formattedResponse);
        }
        console.debug("Formatted LLM Response:", formattedResponse);

    }

    return answers;
}

async function getLLMResponse(experimenterData: ExperimenterData, question: SurveyQuestion): Promise<ModelResponse | null> {
    const prompt = createSurveyQuestionPrompt(question);
    console.debug("Prompt:", prompt);

    // Call LLM API
    let llmResponse;
    try {
        llmResponse = await getAgentResponse(experimenterData, prompt);
    } catch (e) {
        console.error("Error getting agent response:", e);
        llmResponse = null;
    }
    console.debug("Raw LLM Response:", llmResponse);
    return llmResponse;
}

/**
 * Format the LLM response into a BaseSurveyAnswer object.
 * @param questionKind The kind of the survey question
 * @param answer the LLM response
 * @returns the answer in the appropriate type
 */
function formatAnswer(question: SurveyQuestion, llmAnswer: ModelResponse | null): BaseSurveyAnswer | null {
    if (!llmAnswer) {
        return INVALID_ANSWER;
    }

    const llmAnswerStr = llmAnswer.text;
    const id = "placeholder"; //TODO: Figure out ID

    switch (question.kind) {
        case SurveyQuestionKind.TEXT:
            return formatFreeText(id, llmAnswerStr);
        case SurveyQuestionKind.MULTIPLE_CHOICE:
            return formatMultipleAnswer(id, question, llmAnswerStr);
        case SurveyQuestionKind.CHECK:
            return formatCheckAnswer(id, llmAnswerStr);
        case SurveyQuestionKind.SCALE:
            return formatScale(id, question, llmAnswerStr);
    }

}

function formatFreeText(id: string, llmAnswerStr: string): TextSurveyAnswer | null {
    return { id: id, kind: SurveyQuestionKind.TEXT, answer: llmAnswerStr }
}

function formatMultipleAnswer(id: string, question: MultipleChoiceSurveyQuestion, llmAnswerStr: string): MultipleChoiceSurveyAnswer | null {
    const index = parseCatchInt(llmAnswerStr);
    if (!index) {
        return null;
    }

    const item = question.options[index];
    if (!item) {
        console.error("Invalid survey multiple choice index:", index);
        return null;
    } else {
        return { id: id, kind: SurveyQuestionKind.MULTIPLE_CHOICE, choiceId: item.id };
    }
}

function formatCheckAnswer(id: string, llmAnswerStr: string): CheckSurveyAnswer | null {
    if (llmAnswerStr !== "yes" && llmAnswerStr !== "no") {
        console.error("Invalid survey check answer:", llmAnswerStr);
        return null;
    }
    else {
        const answer = llmAnswerStr.trim() === "yes";
        return { id: id, kind: SurveyQuestionKind.CHECK, isChecked: answer };
    }
}

function formatScale(id: string, question: ScaleSurveyQuestion, llmAnswerStr: string): ScaleSurveyAnswer | null {
    const value = parseCatchInt(llmAnswerStr);
    if (!value) {
        return null;
    }

    if (value < question.lowerValue || value > question.upperValue) {
        console.error(`Survey scale answer out of range: ${value}, expected between ${question.lowerValue} and ${question.upperValue}`);
        return null;
    }
    return { id: id, kind: SurveyQuestionKind.SCALE, value };
}

function parseCatchInt(savedValue: any): number | null {
    if (typeof savedValue === "number") {
        return savedValue;
    } else if (savedValue !== null && typeof savedValue === "string" && !isNaN(parseInt(savedValue))) {
        return parseInt(savedValue.trim());
    }
    console.error("Invalid index (not a number):", savedValue);
    return null;
}