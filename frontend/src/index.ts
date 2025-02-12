import {html, render} from 'lit';
import './app';
import {core} from './core/core';
import {makeServiceProvider} from './service_provider';
import {InitializationService} from './services/initialization.service';

async function main() {
  core.initialize(makeServiceProvider);

  // Initialize the global services, if necessary
  const initializationService = core.getService(InitializationService);
  await initializationService.initialize();

  render(html`<deliberation-lab></deliberation-lab>`, document.body);
}
main();
