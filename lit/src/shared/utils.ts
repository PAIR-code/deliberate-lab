/**
 * Shared utils functions.
 */

import { HttpsCallableResult } from 'firebase/functions';
import { v4 as uuidv4 } from "uuid";
import { Snapshot } from "./types";

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
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