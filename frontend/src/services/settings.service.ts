import {action, makeObservable, observable} from 'mobx';
import {Unsubscribe, collection, onSnapshot} from 'firebase/firestore';
import {DeliberateLabAPIKey} from '@deliberation-lab/utils';

import {Service} from './service';
import {AuthService} from './auth.service';
import {FirebaseService} from './firebase.service';

import {ColorMode} from '../shared/types';
import {
  createDeliberateLabAPIKeyCallable,
  revokeDeliberateLabAPIKeyCallable,
} from '../shared/callables';

interface ServiceProvider {
  authService: AuthService;
  firebaseService: FirebaseService;
}

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  private apiKeysUnsubscribe: Unsubscribe | null = null;

  @observable colorMode: ColorMode = ColorMode.DEFAULT;

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }

  // Deliberate Lab API Key Management
  @observable deliberateLabAPIKeys: DeliberateLabAPIKey[] = [];
  @observable isLoadingDeliberateLabAPIKeys = false;
  @observable deliberateLabAPIKeyError: string | null = null;
  @observable newlyCreatedDeliberateLabAPIKey: string | null = null;

  /**
   * Subscribe to Deliberate Lab API keys for the current user
   */
  @action
  subscribeToDeliberateLabAPIKeys() {
    // Unsubscribe from any existing listener
    this.unsubscribeFromDeliberateLabAPIKeys();

    const userId = this.sp.authService.userEmail?.toLowerCase();
    if (!userId) {
      this.deliberateLabAPIKeys = [];
      return;
    }

    this.isLoadingDeliberateLabAPIKeys = true;
    this.deliberateLabAPIKeyError = null;

    try {
      const apiKeysRef = collection(
        this.sp.firebaseService.firestore,
        'experimenters',
        userId,
        'apiKeys',
      );

      this.apiKeysUnsubscribe = onSnapshot(
        apiKeysRef,
        (snapshot) => {
          this.deliberateLabAPIKeys = snapshot.docs.map((doc) => ({
            keyId: doc.id,
            name: doc.data().name as string,
            createdAt: doc.data().createdAt as number,
            lastUsed: (doc.data().lastUsed as number | null) || null,
            permissions: doc.data().permissions as string[],
          }));
          this.isLoadingDeliberateLabAPIKeys = false;
        },
        (error) => {
          console.error('Error subscribing to Deliberate Lab API keys:', error);
          this.deliberateLabAPIKeyError =
            'Failed to load Deliberate Lab API keys';
          this.isLoadingDeliberateLabAPIKeys = false;
        },
      );
    } catch (e) {
      console.error(
        'Error setting up Deliberate Lab API keys subscription:',
        e,
      );
      this.deliberateLabAPIKeyError = 'Failed to load Deliberate Lab API keys';
      this.isLoadingDeliberateLabAPIKeys = false;
    }
  }

  /**
   * Unsubscribe from Deliberate Lab API keys
   */
  unsubscribeFromDeliberateLabAPIKeys() {
    if (this.apiKeysUnsubscribe) {
      this.apiKeysUnsubscribe();
      this.apiKeysUnsubscribe = null;
    }
  }

  /**
   * Create a new Deliberate Lab API key
   */
  @action
  async createDeliberateLabAPIKey(name: string): Promise<boolean> {
    if (!name.trim()) {
      this.deliberateLabAPIKeyError =
        'Please enter a name for the Deliberate Lab API key';
      return false;
    }

    this.isLoadingDeliberateLabAPIKeys = true;
    this.deliberateLabAPIKeyError = null;
    try {
      const result = await createDeliberateLabAPIKeyCallable(
        this.sp.firebaseService.functions,
        name.trim(),
      );
      this.newlyCreatedDeliberateLabAPIKey = result.apiKey;
      return true;
    } catch (e) {
      console.error('Error creating Deliberate Lab API key:', e);
      this.deliberateLabAPIKeyError = 'Failed to create Deliberate Lab API key';
      return false;
    } finally {
      this.isLoadingDeliberateLabAPIKeys = false;
    }
  }

  /**
   * Revoke a Deliberate Lab API key
   */
  @action
  async revokeDeliberateLabAPIKey(keyId: string): Promise<boolean> {
    this.isLoadingDeliberateLabAPIKeys = true;
    this.deliberateLabAPIKeyError = null;
    try {
      await revokeDeliberateLabAPIKeyCallable(
        this.sp.firebaseService.functions,
        keyId,
      );
      return true;
    } catch (e) {
      console.error('Error revoking Deliberate Lab API key:', e);
      this.deliberateLabAPIKeyError = 'Failed to revoke Deliberate Lab API key';
      return false;
    } finally {
      this.isLoadingDeliberateLabAPIKeys = false;
    }
  }

  /**
   * Clear the newly created Deliberate Lab API key from view
   */
  @action
  dismissNewDeliberateLabAPIKey() {
    this.newlyCreatedDeliberateLabAPIKey = null;
  }

  /**
   * Clear any Deliberate Lab API key error message
   */
  @action
  clearDeliberateLabAPIKeyError() {
    this.deliberateLabAPIKeyError = null;
  }
}
