import {
    SurveyStageConfig,
    ExperimenterData,
    ParticipantProfileExtended,
    createQuestionPrompt,
} from "@deliberation-lab/utils";
import { getAgentResponse } from '../agent.utils';


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
        const prompt = createQuestionPrompt(question);
        // Call LLM API
        const response = await getAgentResponse(experimenterData, prompt);
        answers.push(response);
        console.debug("Prompt:", prompt)
        console.debug("Answer:", response)
    }

    return answers;
}