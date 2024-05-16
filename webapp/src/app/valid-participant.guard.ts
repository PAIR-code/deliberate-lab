import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { participantQuery } from 'src/lib/api/queries';
import { querySuccessPromise } from 'src/lib/utils/queries.utils';

/** Check that a participant exists */
export const validParticipantGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const { participantId } = route.params;
  const participant = participantQuery(participantId, true);

  return querySuccessPromise(participant);
};
