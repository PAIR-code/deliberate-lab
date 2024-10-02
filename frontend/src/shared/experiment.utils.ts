import {
  Experiment,
  StageConfig,
  StageKind,
  Visibility
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
  }
}

/** Return stages that support reveal views. */
export function getStagesWithReveal(stages: StageConfig[]) {
  return stages.filter(
    stage => stage.kind === StageKind.SURVEY || stage.kind === StageKind.RANKING
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