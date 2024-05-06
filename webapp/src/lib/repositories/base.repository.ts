import { Unsubscribe } from 'firebase/firestore';

/** Base class for all Firestore repositories */
export abstract class BaseRepository {
  protected unsubscribe: Unsubscribe[] = [];

  unsubscribeAll(): void {
    // Unsubscribe from firestore
    this.unsubscribe.forEach((unsub) => unsub());
    this.unsubscribe = [];
  }
}
