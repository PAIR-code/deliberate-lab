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
  experiment: Experiment
): GalleryItem {
  return {
    title: experiment.metadata.name,
    description: experiment.metadata.description,
    creator: experiment.metadata.creator,
    date: convertUnifiedTimestampToDate(experiment.metadata.dateModified),
    isPublic: experiment.permissions.visibility === Visibility.PUBLIC,
    isStarred: false, // TODO: Find user isStarred value
    tags: experiment.metadata.tags,
  };
}

/** Return stages that support reveal views. */
export function getStagesWithReveal(stages: StageConfig[]) {
  return stages.filter(
    (stage) =>
      stage.kind === StageKind.SURVEY || stage.kind === StageKind.RANKING
  );
}

/** Get private experiment name (or default value if field is empty). */
export function getPrivateExperimentName(
  experiment: Experiment|undefined,
  defaultValue = 'New experiment',
) {
  if (!experiment) return defaultValue;
  return experiment.metadata.name.length > 0 ? experiment.metadata.name : defaultValue;
}

/** Get public experiment name (or default value if field is empty). */
export function getPublicExperimentName(
  experiment: Experiment|undefined,
  defaultValue = 'Experiment',
) {
  if (!experiment) return defaultValue;
  return experiment.metadata.publicName.length > 0 ? experiment.metadata.publicName : defaultValue;
}

/** Returns all survey or election stages preceding the stage with the current ID. */
export function getPrecedingRevealableStages(
  currentStageId: string,
  currentStages: StageConfig[]
): StageConfig[] {
  const revealStages = getStagesWithReveal(currentStages).filter(
    (stage) => stage.id !== currentStageId
  );

  // Get the current stage index.
  const currentStageIndex = currentStages.findIndex(
    (stage) => stage.id === currentStageId
  );

  // Filter stages to only those before the current stage index.
  const filteredStages = revealStages.filter((stage) => {
    const stageIndex = currentStages.findIndex(
      (expStage) => expStage.id === stage.id
    );
    return stageIndex < currentStageIndex;
  });

  return filteredStages;
}

/** Get experiment name (or default value if field is empty). */
export function getExperimentName(
  experiment: Experiment,
  defaultValue = 'Experiment'
) {
  return experiment.metadata.name.length > 0
    ? experiment.metadata.name
    : defaultValue;
}

/* Returns whether the current stage must wait for all participants due to previous dependencies. */
export function mustWaitForAllParticipants(
  stage: StageConfig,
  allStages: StageConfig[]
): boolean {
  if (!stage || stage.kind !== StageKind.REVEAL) {
    return false;
  }

  for (const item of stage.items) {
    // There's a dependency on all participants if we want to reveal all results.
    if (
      'revealAudience' in item &&
      item.revealAudience === RevealAudience.ALL_PARTICIPANTS
    ) {
      return true;
    }
    if (item.kind === StageKind.RANKING) {
      const stageId = item.id;

      const foundStage = allStages.find((stage) => stage.id === stageId);
      // There's a dependency on all participants if we're ranking all participants.
      if (
        foundStage &&
        'rankingType' in foundStage &&
        foundStage.rankingType === RankingType.PARTICIPANTS
      ) {
        return true;
      }

      // There's a dependency on all participants if there's an election
      // (so all votes are counted).
      if (
        foundStage &&
        'strategy' in foundStage &&
        foundStage.strategy === ElectionStrategy.CONDORCET
      ) {
        return true;
      }
    }
  }
  return false;
}
