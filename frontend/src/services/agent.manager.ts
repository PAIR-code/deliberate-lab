import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {ExperimentManager} from './experiment.manager';
import {FirebaseService} from './firebase.service';
import {Service} from './service';

import {
  AgentChatPromptConfig,
  AgentDataObject,
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
  MediatorStatus,
  StructuredOutputConfig,
  createStructuredOutputConfig,
} from '@deliberation-lab/utils';
import {updateMediatorStatusCallable} from '../shared/callables';

interface ServiceProvider {
  experimentManager: ExperimentManager;
  firebaseService: FirebaseService;
}

/** Manages agent configs/prompts for experimenters.
 *  For agent profiles only (for participant views), see cohort.service.ts
 *  For agent editor, see agent.editor.ts
 */
export class AgentManager extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  async getAgentDataObjects(experimentId: string): Promise<AgentDataObject[]> {
    const dataObjects: AgentDataObject[] = [];

    const agentCollection = collection(
      this.sp.firebaseService.firestore,
      'experiments',
      experimentId,
      'agents',
    );
    const agents = (await getDocs(agentCollection)).docs.map(
      (agent) => agent.data() as AgentPersonaConfig,
    );
    for (const persona of agents) {
      const participantPrompts = (
        await getDocs(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            experimentId,
            'agents',
            persona.id,
            'participantPrompts',
          ),
        )
      ).docs.map((doc) => doc.data() as AgentParticipantPromptConfig);
      const chatPrompts = (
        await getDocs(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            experimentId,
            'agents',
            persona.id,
            'chatPrompts',
          ),
        )
      ).docs.map(
        (doc) =>
          ({
            // Include false, empty structured output config for experiments
            // created before version 17
            structuredOutputConfig: createStructuredOutputConfig({
              enabled: false,
            }),
            ...doc.data(),
          }) as AgentChatPromptConfig,
      );
      const agentObject: AgentDataObject = {
        persona,
        participantPromptMap: {},
        chatPromptMap: {},
      };
      participantPrompts.forEach((prompt) => {
        agentObject.participantPromptMap[prompt.id] = prompt;
      });
      chatPrompts.forEach((prompt) => {
        // For experiments created before version 17 with structured output
        // enabled, set StructuredOutputConfig enabled to true and remove
        // deprecated AgentResponseConfig
        if (prompt.responseConfig?.isJSON) {
          prompt.structuredOutputConfig.enabled = true;
          delete prompt.responseConfig;
        }
        agentObject.chatPromptMap[prompt.id] = prompt;
      });
      dataObjects.push(agentObject);
    }
    return dataObjects;
  }

  /** Change mediator status. */
  async updateMediatorStatus(mediatorId: string, status: MediatorStatus) {
    let response = {};
    const experimentId = this.sp.experimentManager.experimentId;
    if (experimentId) {
      response = await updateMediatorStatusCallable(
        this.sp.firebaseService.functions,
        {
          experimentId,
          mediatorId,
          status,
        },
      );
    }
    return response;
  }
}
