const fs = require('fs');
const path = require('path');

const jsonPath =
  '/Users/ziyiliu/Downloads/Copy of Pilot study GUIDE (v2)_data/Copy of Pilot study GUIDE (v2).json';
const outPath = path.join(
  __dirname,
  '../frontend/src/shared/templates/guide_pilot_study.ts',
);

console.log(`Reading JSON from ${jsonPath}...`);
const raw = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(raw);

// Clean creator and visibility
if (data.experiment && data.experiment.metadata) {
  data.experiment.metadata.creator = '';
}
if (data.experiment && data.experiment.permissions) {
  data.experiment.permissions.visibility = 'public';
}

const content = `// Auto-generated from Copy of Pilot study GUIDE (v2).json
import { ExperimentTemplate, StageConfig, AgentMediatorTemplate, AgentParticipantTemplate } from '@deliberation-lab/utils';

const GUIDE_DATA: any = ${JSON.stringify(data, null, 2)};

export function getGuidePilotStudyTemplate(): ExperimentTemplate {
  const exp = { ...GUIDE_DATA.experiment };
  exp.metadata = { ...exp.metadata, creator: '' };
  exp.permissions = { visibility: 'public', readers: [] };

  const stageConfigs: StageConfig[] = (exp.stageIds || [])
    .map((id: string) => GUIDE_DATA.stageMap[id])
    .filter(Boolean);

  const agentMediators: AgentMediatorTemplate[] = Object.values(GUIDE_DATA.agentMediatorMap || {});
  const agentParticipants: AgentParticipantTemplate[] = Object.values(GUIDE_DATA.agentParticipantMap || {});

  return {
    id: exp.id || 'f11aab82-87cd-459b-a6bc-ad51e6a649e6',
    experiment: exp,
    stageConfigs,
    agentMediators,
    agentParticipants,
  };
}
`;

console.log(`Writing template to ${outPath}...`);
fs.writeFileSync(outPath, content, 'utf8');
console.log('✅ Generated guide_pilot_study.ts!');
