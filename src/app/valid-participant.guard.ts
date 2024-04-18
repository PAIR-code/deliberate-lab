import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { participantQuery } from 'src/lib/api/queries';
import { querySuccessPromise } from 'src/lib/utils/queries.utils';

/** Check that a participant exists */
export const validParticipantGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const http = inject(HttpClient);

  const { participantId } = route.params;
  // ISSUE: this starts as false ! we must use a promise and wait for this to resolve...
  // et le pb2 c'est le participant qui veut pas bouger...
  const participant = participantQuery(http, participantId);

  return querySuccessPromise(participant);
};
