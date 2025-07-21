import {
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
} from 'firebase/database';

import {makeObservable} from 'mobx';

import {Service} from './service';
import {FirebaseService} from './firebase.service';

interface ServiceProvider {
  firebaseService: FirebaseService;
}

/** Tracks whether a participant is connected, using the firebase realtime database's websocket */
export class PresenceService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  setupPresence(experimentId: string, participantPrivateId: string) {
    const statusRef = ref(
      this.sp.firebaseService.rtdb,
      `/status/${experimentId}/${participantPrivateId}`,
    );

    const isOffline = {
      connected: false,
      last_changed: serverTimestamp(),
    };

    const isOnline = {
      connected: true,
      last_changed: serverTimestamp(),
    };

    onValue(
      ref(this.sp.firebaseService.rtdb, '.info/connected'),
      (snapshot) => {
        const isConnected = snapshot.val();
        if (!isConnected) {
          return;
        }

        // Set the user's status in rtdb. The callback will reset it to online
        // if the user reconnects.
        onDisconnect(statusRef)
          .set(isOffline)
          .then(() => {
            set(statusRef, isOnline);
          });
      },
    );
  }
}
