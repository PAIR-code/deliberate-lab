import { CanActivateFn } from '@angular/router';
import { GoogleAuthService } from './services/google-auth.service';
import { inject } from '@angular/core';

export const experimenterAuthGuard: CanActivateFn = (route, state) => {
  return true;
  // Change to this to actually limit access.
  // return inject(GoogleAuthService).credential() !== null;
};
