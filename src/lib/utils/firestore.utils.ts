import { doc, onSnapshot } from 'firebase/firestore';
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
