import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { participantQuery } from 'src/lib/api/queries';

/** Check that a participant exists */
export const validParticipantGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const http = inject(HttpClient);

  const { participantId } = route.params;

  const participant = participantQuery(http, participantId);

  return !!participant.data(); // If the data exists, the participant is valid
};
