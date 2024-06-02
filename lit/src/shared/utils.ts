/**
 * Shared utils functions.
 */

import { HttpsCallableResult } from 'firebase/functions';
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { v4 as uuidv4 } from "uuid";
import { Snapshot, StageConfig, StageKind } from "./types";

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Use micromark to convert Git-flavored markdown to HTML. */
export function convertMarkdownToHTML(markdown: string, sanitize = true) {
  const html = micromark(markdown, {
    allowDangerousHtml: !sanitize,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  return html;
}

/** Adjust experiment stages to Firebase format (e.g., HTML instead of .md) */
export function convertExperimentStages(stages: StageConfig[]) {
  return stages.map((stage) => {
    if (stage.kind === StageKind.Info) {
      stage.infoLines = stage.infoLines.map(
        info => convertMarkdownToHTML(info)
      );
      return stage;
    }
    return stage;
  })
}

/**
 * Collect the data of multiple documents into an array,
 * including the document Firestore ID within the field with the given key.
 */
export function collectSnapshotWithId<T>(snapshot: Snapshot, idKey: keyof T) {
  return snapshot.docs.map((doc) => ({ [idKey]: doc.id, ...doc.data() }) as T);
}

/** Wrapper to extract the data attribute from all callable cloud functions */
export function extractDataFromCallable<TArgs, TReturn>(
  args: TArgs,
  f: (args: TArgs) => Promise<HttpsCallableResult<TReturn>>
) {
  return f(args).then((r) => r.data);
}