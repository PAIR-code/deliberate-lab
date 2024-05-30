/**
 * Shared utils functions.
 */

import { HttpsCallableResult } from 'firebase/functions';
import { v4 as uuidv4 } from "uuid";
import { ChatStage, InfoStage, Profile, Snapshot, StageType } from "./types";

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Generate blank chat stage. */
export function createBlankChatStage(): ChatStage {
  return {
    type: StageType.CHAT,
    id: generateId(),
    name: "Untitled chat",
    profiles: [],
    messages: []
  };
}

/** Generate blank profile. */
export function createBlankProfile(): Profile {
  return { id: generateId(), name: "", pronouns: "", avatar: "" };
}

/** Generate blank info stage. */
export function createBlankInfoStage(): InfoStage {
  return {
    type: StageType.INFO,
    id: generateId(),
    name: "Untitled info",
    content: "",
    acknowledgment: false
  };
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