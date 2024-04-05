// TODO : move all stage types here

import { ExpStage, StageKinds } from '../staged-exp/data-model';

const AUTO_PROGRESS_STAGES = [
  StageKinds.takeSurvey.toString(),
  StageKinds.voteForLeader.toString(),
];

/** NOTE: this is completely useless. We could check stage kinds directly in the frontend instead of generating this. */
export const generateAllowedStageProgressionMap = (stages: ExpStage[]): Record<string, boolean> => {
  const allowedStageProgressionMap: Record<string, boolean> = {};

  stages.forEach(
    (stage) => (allowedStageProgressionMap[stage.name] = AUTO_PROGRESS_STAGES.includes(stage.kind)),
  );

  return allowedStageProgressionMap;
};
