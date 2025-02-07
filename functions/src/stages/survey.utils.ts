import {
    SurveyStageConfig,
    ExperimenterData,
    ParticipantProfileExtended,
    createQuestionPrompt,
} from "@deliberation-lab/utils";
import { getAgentResponse } from '../agent.utils';


//TODO: add participant information to prompt
export async function getAgentParticipantSurveyResponse(
    experimentId: string,
    experimenterData: ExperimenterData, // for making LLM call
    participant: ParticipantProfileExtended,
    stage: SurveyStageConfig) {
    
    const answers = []
    // Build prompt
    for (let question of stage.questions) {
        const prompt = createQuestionPrompt(question);

        // Call LLM API
        const response = await getAgentResponse(experimenterData, prompt);
        answers.push(response);
    }

    // Check console log for response
    console.log(
        'TESTING AGENT PARTICIPANT PROMPT FOR RANKING STAGE\n',
        `Experiment: ${experimentId}\n`,
        `Participant: ${participant.publicId}\n`,
        `Stage: ${stage.name} (${stage.kind})\n`,
        answers
    );

    return answers;
}