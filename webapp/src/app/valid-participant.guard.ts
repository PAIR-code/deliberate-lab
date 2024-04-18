import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { AppStateService } from './services/app-state.service';
import { inject } from '@angular/core';

export const validParticipantGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const stateService = inject(AppStateService);
  // console.log('validParticipantGuard,', route.params);
  // console.log('validParticipantGuard,', route.params['experiment']);
  // this.participant = makeRouteLinkedParticipant(router, route, stateService.data);
  // if (this.participant) {
  //   stateService.state.set({ kind: APPSTATE_PARTICIPANT, particpant: this.participant });
  // }

  return stateService.validParticipant(
    route.params['experiment'],
    route.params['user'],
    // route.queryParams['stage'],
  );
};
