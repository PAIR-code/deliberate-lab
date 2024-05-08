import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from 'src/lib/api/firebase';

/** Check that a participant exists */
export const validParticipantGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const { experimentId, participantId } = route.params;

  if (!experimentId || !participantId) return false;

  // The participant is valid if the document exists
  return getDoc(doc(firestore, 'experiments', experimentId, 'participants', participantId)).then(
    (a) => a.exists(),
  );
};
