import {micromark} from 'micromark';
import {gfm, gfmHtml} from 'micromark-extension-gfm';
import {UnifiedTimestamp, getHashIntegerFromString} from '@deliberation-lab/utils';
import {Snapshot} from './types';

/**
 * General utils for frontend only.
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
export function convertUnifiedTimestampToDate(
  timestamp: UnifiedTimestamp,
  showLongFormat: boolean = true
) {
  const date = new Date(timestamp.seconds * 1000);
  if (showLongFormat) {
    return `${date.toDateString()} (${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')})`;
  } else {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
}

/** Get random or hash-based color (e.g., for avatar backgroud). */
export function getColor(hashString = ''): string {
  const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
  const index = hashString.length > 0 ?
    getHashIntegerFromString(hashString) % COLORS.length
    : Math.floor(Math.random() * COLORS.length);

  return COLORS[index];
}
