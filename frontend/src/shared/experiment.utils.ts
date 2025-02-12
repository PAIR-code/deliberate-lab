import {
  ElectionStrategy,
  Experiment,
  RevealAudience,
  RankingType,
  StageConfig,
  StageKind,
  Visibility,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from './utils';
import {GalleryItem} from './types';

/**
 * Experiment utils for frontend only.
 * For utils shared between frontend and backend, see @deliberation-lab/utils
 */

/** Convert experiment config to gallery item. */
export function convertExperimentToGalleryItem(
  experiment: Experiment,
): GalleryItem {
  return {
    title: experiment.metadata.name,
    description: experiment.metadata.description,
    creator: experiment.metadata.creator,
    date: convertUnifiedTimestampToDate(experiment.metadata.dateModified),
    version: experiment.versionId,
    isPublic: experiment.permissions.visibility === Visibility.PUBLIC,
    isStarred: false, // TODO: Find user isStarred value
    tags: experiment.metadata.tags,
  };
}

/** Return stages that support reveal views. */
export function getStagesWithReveal(stages: StageConfig[]) {
  return stages.filter(
    (stage) =>
      stage.kind === StageKind.SURVEY ||
      stage.kind === StageKind.RANKING ||
      stage.kind === StageKind.CHIP,
  );
}

/** Get private experiment name (or default value if field is empty). */
export function getPrivateExperimentName(
  experiment: Experiment | undefined,
  defaultValue = 'New experiment',
) {
  if (!experiment) return defaultValue;
  return experiment.metadata.name.length > 0
    ? experiment.metadata.name
    : defaultValue;
}

/** Get public experiment name (or default value if field is empty). */
export function getPublicExperimentName(
  experiment: Experiment | undefined,
  defaultValue = 'Experiment',
) {
  if (!experiment) return defaultValue;
  return experiment.metadata.publicName.length > 0
    ? experiment.metadata.publicName
    : defaultValue;
}

/** Returns all survey or election stages preceding the current stage. */
export function getPrecedingRevealableStages(
  currentStageId: string,
  currentStages: StageConfig[],
): StageConfig[] {
  const revealStages = getStagesWithReveal(currentStages).filter(
    (stage) => stage.id !== currentStageId,
  );

  // Get the current stage index.
  const currentStageIndex = currentStages.findIndex(
    (stage) => stage.id === currentStageId,
  );

  // Filter stages to only those before the current stage index.
  const filteredStages = revealStages.filter((stage) => {
    const stageIndex = currentStages.findIndex(
      (expStage) => expStage.id === stage.id,
    );
    return stageIndex < currentStageIndex;
  });

  return filteredStages;
}

/** Get experiment name (or default value if field is empty). */
export function getExperimentName(
  experiment: Experiment,
  defaultValue = 'Experiment',
) {
  return experiment.metadata.name.length > 0
    ? experiment.metadata.name
    : defaultValue;
}

/* Returns whether the current stage must wait for all participants due to
 * previous dependencies. */
export function mustWaitForAllParticipants(
  stage: StageConfig,
  allStages: StageConfig[],
): boolean {
  if (!stage || stage.kind !== StageKind.REVEAL) {
    return false;
  }

  // For reveal stages, must wait for all participants if:
  // 1. We want to reveal ALL results
  // 2. The ranking is across all participants
  // 3. There's an election
  for (const item of stage.items) {
    // 1. If the reveal item is set to reveal all participants' results
    if (item.revealAudience === RevealAudience.ALL_PARTICIPANTS) {
      return true;
    }

    if (item.kind === StageKind.RANKING) {
      const stageId = item.id;
      const rankingStage = allStages.find((stage) => stage.id === stageId);

      // Confirm stage is a ranking stage
      if (!rankingStage || rankingStage.kind !== StageKind.RANKING) break;

      // 2. If the ranking is across all participants
      if (rankingStage.rankingType === RankingType.PARTICIPANTS) {
        return true;
      }
      // 3. If the ranking stage includes an election
      // (i.e., all participants' votes are counted)
      if (rankingStage.strategy === ElectionStrategy.CONDORCET) {
        return true;
      }
    }
  }
  return false;
}

/** If must wait for all participants, set waitForAllParticipants in stage. */
export function setMustWaitForAllParticipants(
  stage: StageConfig,
  allStages: StageConfig[],
) {
  if (mustWaitForAllParticipants(stage, allStages)) {
    stage.progress.waitForAllParticipants = true;
  }
}
