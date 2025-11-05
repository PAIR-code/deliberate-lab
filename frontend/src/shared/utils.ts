import {micromark} from 'micromark';
import {gfm, gfmHtml} from 'micromark-extension-gfm';
import {
  UnifiedTimestamp,
  getHashIntegerFromString,
} from '@deliberation-lab/utils';
import {Snapshot} from './types';
import {MAN_EMOJIS, WOMAN_EMOJIS, PERSON_EMOJIS} from './constants';

/**
 * General utils for frontend only.
 * For utils shared between frontend and backend, see @deliberation-lab/utils
 */

/** Use micromark to convert Git-flavored markdown to HTML. */
export function convertMarkdownToHTML(
  markdown: string | null,
  sanitize = true,
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
  return snapshot.docs.map((doc) => ({[idKey]: doc.id, ...doc.data()}) as T);
}

/**
 * Converts UnifiedTimestamp to previewable date.
 */
export function convertUnifiedTimestampToDate(
  timestamp: UnifiedTimestamp,
  showLongFormat: boolean = true,
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

/**
 * Converts UnifiedTimestamp to %Y-%m-%d %H:%M:%OS3.
 */
export function convertUnifiedTimestampToISO(timestamp: UnifiedTimestamp) {
  const date = new Date(timestamp.seconds * 1000);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/** Get color based on profile ID and avatar
 *  (e.g., use pronoun colors if avatar matches
 */
export function getProfileBasedColor(publicId: string, avatar: string) {
  if (MAN_EMOJIS.indexOf(avatar) > -1) {
    return 'blue';
  } else if (WOMAN_EMOJIS.indexOf(avatar) > -1) {
    return 'pink';
  } else if (PERSON_EMOJIS.indexOf(avatar) > -1) {
    return 'purple';
  }

  // If publicId is in format animal-color-number, extract color
  const splitId = (publicId ?? '').split('-');
  if (splitId.length >= 3) {
    return splitId[1];
  }

  // Else, return hash-based color
  return getHashBasedColor(publicId);
}

/** Get random or hash-based color (e.g., for avatar backgroud). */
export function getHashBasedColor(hashString = ''): string {
  const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
  const index =
    hashString.length > 0
      ? getHashIntegerFromString(hashString) % COLORS.length
      : Math.floor(Math.random() * COLORS.length);

  return COLORS[index];
}
