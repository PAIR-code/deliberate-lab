import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import {
  Experiment,
  UnifiedTimestamp
} from '@deliberation-lab/utils';

import { GalleryItem, Snapshot } from './types';

/**
 * Utils for frontend only.
 * For utils shared between frontend and backend, see @deliberation-lab/utils
 */

/** Use micromark to convert Git-flavored markdown to HTML. */
export function convertMarkdownToHTML(
  markdown: string | null,
  sanitize = true
) {
  if (!markdown) {
    return '';
  }
  const html = micromark(markdown, {
    allowDangerousHtml: !sanitize,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  return html;
}

/**
 * Collect the data of multiple documents into an array,
 * including the document Firestore ID within the field with the given key.
 */
export function collectSnapshotWithId<T>(snapshot: Snapshot, idKey: keyof T) {
  return snapshot.docs.map((doc) => ({[idKey]: doc.id, ...doc.data()} as T));
}

/**
 * Converts UnifiedTimestamp to previewable date.
 */
export function convertUnifiedTimestampToDate(timestamp: UnifiedTimestamp) {
  const date = new Date(timestamp.seconds * 1000);
  return `${date.toDateString()} (${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')})`;
}

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