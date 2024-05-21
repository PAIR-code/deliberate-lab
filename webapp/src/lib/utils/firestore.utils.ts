import { Message } from '@llm-mediation-experiments/utils';
import {
  DocumentData,
  QuerySnapshot,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '../api/firebase';

/** Subscribe to a firestore document. Returns an unsubscription method. */
export const firestoreDocSubscription = <T>(
  ref: string,
  callback: (data: T | undefined) => void,
) => {
  return onSnapshot(doc(firestore, ref), (doc) => {
    callback(doc.data() as T | undefined);
  });
};

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

/** Subscribe to chat messages. Returns an unsubscription method.
 * The messages are ordered by recency, and limited to the 10 most recent messages.
 */
export const chatMessagesSubscription = (
  chatId: string,
  callback: (messages: Message[]) => void,
) => {
  const q = query(
    collection(firestore, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'desc'),
    limit(5), // Support new messages being added by batch
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }) as Message));
  });
};

// ********************************************************************************************* //
//                                       COLLECT DOCUMENTS                                       //
// ********************************************************************************************* //

type Snapshot = QuerySnapshot<DocumentData, DocumentData>;

/** Collect the data of multiple documents into an array, including the document Firestore ID within the field with the given key */
export const collectSnapshotWithId = <T>(snapshot: Snapshot, idKey: keyof T) => {
  return snapshot.docs.map((doc) => ({ [idKey]: doc.id, ...doc.data() }) as T);
};

/** Collect the data of multiple document changes into an array, including the document Firestore ID within the field with the given key */
export const collectChangesWithId = <T>(snapshot: Snapshot, idKey: keyof T) => {
  return snapshot
    .docChanges()
    .map((change) => ({ [idKey]: change.doc.id, ...change.doc.data() }) as T);
};
