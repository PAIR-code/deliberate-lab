import {action, makeObservable, observable} from 'mobx';
import {DeliberateLabAPIKey} from '@deliberation-lab/utils';

import {Service} from './service';
import {FirebaseService} from './firebase.service';

import {ColorMode} from '../shared/types';
import {
  createDeliberateLabAPIKeyCallable,
  listDeliberateLabAPIKeysCallable,
  revokeDeliberateLabAPIKeyCallable,
} from '../shared/callables';

interface ServiceProvider {
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
   * Load all Deliberate Lab API keys for the current user
   */
  @action
  async loadDeliberateLabAPIKeys() {
    this.isLoadingDeliberateLabAPIKeys = true;
    this.deliberateLabAPIKeyError = null;
    try {
      const result = await listDeliberateLabAPIKeysCallable(
        this.sp.firebaseService.functions,
      );
      this.deliberateLabAPIKeys = result.keys;
    } catch (e) {
      console.error('Error loading Deliberate Lab API keys:', e);
      this.deliberateLabAPIKeyError = 'Failed to load Deliberate Lab API keys';
    } finally {
      this.isLoadingDeliberateLabAPIKeys = false;
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
      await this.loadDeliberateLabAPIKeys();
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
      await this.loadDeliberateLabAPIKeys();
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
