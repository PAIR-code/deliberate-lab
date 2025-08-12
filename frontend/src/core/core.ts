import {Service} from '../services/service';
import {Constructor} from '../shared/types';

interface ServiceProvider {
  [key: string]: Service;
}

/**
 * The core app module, which is responsible for instantiating and initializing
 * all of the singleton services. In order to resolve inter-service
 * dependencies, the services are constructed with a ServiceProvider object
 * which provides access to the other lazily-constructed services. This way,
 * each service can specify which services it depends on via an interface.
 *
 * Services are responsible for providing this ServiceProvider into the
 * constructors of the various objects that they build (Operations, etc).
 */
export class Core {
  /** Services are singletons on an app-level. */
  private readonly services = new Map<Constructor<Service>, Service>();

  getService<T extends Service>(t: Constructor<T>): T {
    return this.buildService(t);
  }

  buildService<T extends Service>(t: Constructor<T>): T {
    const isService = t.prototype instanceof Service;
    if (isService) {
      const serviceConstructor = t as unknown as Constructor<Service>;
      let service = this.services.get(serviceConstructor);
      if (service == null) {
        service = new serviceConstructor(this.serviceProvider);
        this.services.set(serviceConstructor, service);
      }
      return service as unknown as T;
    }

    throw new Error(`Attempting to get ${t.name}, which is not a Service.`);
  }

  initialize = (makeServiceProvider: (core: Core) => ServiceProvider) => {
    const serviceProvider = makeServiceProvider(this);

    const handler = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(target: any, propKey: string) {
        if (serviceProvider.hasOwnProperty(propKey)) {
          return target[propKey];
        }
        throw new Error(`ServiceProvider has not been built with ${propKey}.`);
      },
    };

    const proxy = new Proxy(serviceProvider, handler);

    this.serviceProvider = proxy;
  };

  serviceProvider: ServiceProvider = {};
}

export const core = new Core();
