import { Injectable } from '@angular/core';

/** Generic provider service to share an object instance to subcomponents
 * without relying on an unified global state (inspired from React js context API)
 */
@Injectable()
export class ProviderService<T> {
  private state: T | undefined;

  constructor() {
    this.state = undefined;
  }

  public get(): T {
    if (this.state === undefined) {
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
