import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { FirebaseService } from './firebase.service';

export const experimenterAuthGuard: CanActivateFn = () => {
  return (
    inject(FirebaseService)
      .user()
      ?.getIdTokenResult()
      .then((result) => result.claims['role'] === 'experimenter') ?? false
  );
};
