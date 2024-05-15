import { html, render } from "lit";
import "./app";
import { core } from "./core/core";
import { makeServiceProvider } from "./service_provider";
import { InitializationService } from "./services/initialization_service";

async function main() {
  core.initialize(makeServiceProvider);

  // Initialize the global services, if necessary
  const initializationService = core.getService(InitializationService);
  await initializationService.initialize();

  render(html`<llm-mediation-app></llm-mediation-app>`, document.body);
}
main();
