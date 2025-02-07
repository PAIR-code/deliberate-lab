import {
    SurveyStageConfig,
    ExperimenterData,
    ParticipantProfileExtended,
    createSurveyQuestionPrompt,
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
    stage: SurveyStageConfig) {

    console.debug(
        'TESTING AGENT PARTICIPANT PROMPT FOR RANKING STAGE\n',
        `Experiment: ${experimentId}\n`,
        `Participant: ${participant.publicId}\n`,
        `Stage: ${stage.name} (${stage.kind})\n`);

    const answers = [];
    // Build prompt
    for (let question of stage.questions) {
        const prompt = createSurveyQuestionPrompt(question);
        // Call LLM API
        const response = await getAgentResponse(experimenterData, prompt);
        answers.push(response);
        console.debug("Prompt:", prompt)
        console.debug("Answer:", response)
    }

    return answers;
}