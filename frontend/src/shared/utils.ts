import {micromark} from 'micromark';
import {gfm, gfmHtml} from 'micromark-extension-gfm';

import { Snapshot } from './types';

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