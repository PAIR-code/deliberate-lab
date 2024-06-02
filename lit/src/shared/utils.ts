/**
 * Shared utils functions.
 */

import { HttpsCallableResult } from 'firebase/functions';
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { v4 as uuidv4 } from "uuid";
import { Snapshot } from "./types";
import {
  InfoStageConfig,
  StageConfig,
  StageKind,
  TermsOfServiceStageConfig
} from '@llm-mediation-experiments/utils';

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Create info stage. */
export function createInfoStage(
  name = "Info", content = "Placeholder info"
): InfoStageConfig {
  const infoLines = [content];
  return { kind: StageKind.Info, name, infoLines };
}

/** Create TOS stage. */
export function createTOSStage(
  name = "Terms of Service",
  content = "- Placeholder term 1\n- Placeholder term 2\n- Placeholder term 3",
): TermsOfServiceStageConfig {
  const tosLines = [content];
  return { kind: StageKind.TermsOfService, name, tosLines };
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
    if (stage.kind === StageKind.TermsOfService) {
      stage.tosLines = stage.tosLines.map(
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