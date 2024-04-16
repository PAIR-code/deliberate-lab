import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { Message } from '../types/messages.types';

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
    callback(snapshot.docs.map((doc) => doc.data() as Message));
  });
};
