import { CanActivateFn } from '@angular/router';

export const experimenterAuthGuard: CanActivateFn = (_route, _state) => {
  return true;
  // Change to this to actually limit access.
  // return inject(GoogleAuthService).credential() !== null;
};
