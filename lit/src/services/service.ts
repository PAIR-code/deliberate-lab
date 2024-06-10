/**
 * A base class for all services that allows the app to
 * provide dependencies to components.
 */
export abstract class Service {
  isInitialized = false;

  initialize() {}

  setInitialized() {
    this.isInitialized = true;
  }
}
