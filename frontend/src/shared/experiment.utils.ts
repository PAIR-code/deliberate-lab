import {
  Experiment
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
    creator: 'Author', // TODO: Find user name
    date: convertUnifiedTimestampToDate(experiment.metadata.dateModified),
    isStarred: false, // TODO: Find user isStarred value
    tags: experiment.metadata.tags,
  }
}
