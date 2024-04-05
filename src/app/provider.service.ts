import { Injectable } from '@angular/core';

/** Generic provider service to share an object instance to subcomponents
 * without relying on an unified global state (inspired from React js context API)
 */
@Injectable()
export class ProviderService<T> {
  private state: T;

  constructor() {
    this.state = null as T; // NOTE: upon injecting this provider, you must call the set method to set the initial state.
    // This is a placeholder for convenience, but it may lead to bugs if improperly instanciated.
  }

  public get(): T {
    if (this.state === null) {
      throw new Error(
        'Provider service not initialized. Call the set() method to set the initial state.',
      );
    }
    return this.state;
  }

  public set(value: T): void {
    this.state = value;
  }
}
