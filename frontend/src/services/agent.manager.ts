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
import {FirebaseService} from './firebase.service';
import {Service} from './service';

import {
  AgentChatPromptConfig,
  AgentDataObject,
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
} from '@deliberation-lab/utils';

interface ServiceProvider {
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
      ).docs.map((doc) => doc.data() as AgentChatPromptConfig);
      const agentObject: AgentDataObject = {
        persona,
        participantPromptMap: {},
        chatPromptMap: {},
      };
      participantPrompts.forEach((prompt) => {
        agentObject.participantPromptMap[prompt.id] = prompt;
      });
      chatPrompts.forEach((prompt) => {
        agentObject.chatPromptMap[prompt.id] = prompt;
      });
      dataObjects.push(agentObject);
    }
    return dataObjects;
  }
}
