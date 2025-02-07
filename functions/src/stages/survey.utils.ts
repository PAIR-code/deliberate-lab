import {
    createAgentParticipantSurveyStagePrompt, 
    SurveyStageConfig, 
    ExperimenterData,
    ParticipantProfileExtended,
} from "@deliberation-lab/utils";
import { getAgentResponse } from '../agent.utils';


//TODO: add participant information to prompt
export async function getAgentParticipantSurveyResponse(
    experimentId: string,
    experimenterData: ExperimenterData, // for making LLM call
    participant: ParticipantProfileExtended,
    stage: SurveyStageConfig) {
    // Build prompt
    const prompt = createAgentParticipantSurveyStagePrompt(stage.questions);

    // Call LLM API
    const response = await getAgentResponse(experimenterData, prompt);
    // Check console log for response
    console.log(
        'TESTING AGENT PARTICIPANT PROMPT FOR RANKING STAGE\n',
        `Experiment: ${experimentId}\n`,
        `Participant: ${participant.publicId}\n`,
        `Stage: ${stage.name} (${stage.kind})\n`,
        response
    );

    return response;
}