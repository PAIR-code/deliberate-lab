import { Injectable, OnDestroy } from '@angular/core';

export interface Destroyable {
  destroy?(): void;
}

/** Generic provider service to share an object instance to subcomponents
 * without relying on an unified global state (inspired from React js context API)
 */
@Injectable()
export class ProviderService<T extends Destroyable> implements OnDestroy {
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

  public apply(callback: (state: T | undefined) => void) {
    callback(this.state);
  }

  ngOnDestroy(): void {
    if (this.state && this.state.destroy) {
      this.state.destroy();
    }
  }
}
