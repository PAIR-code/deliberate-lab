import { computed, makeObservable, observable } from "mobx";

import { Service } from "../service";

import { TermsOfServiceStageConfig } from "@llm-mediation-experiments/utils";

/** Manages metadata for TOS stage config. */
export class TOSConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable stage: TermsOfServiceStageConfig|null = null;

  @computed get name() {
    return this.stage?.name;
  }

  @computed get description() {
    return this.stage?.description;
  }

  @computed get content() {
    return this.stage?.tosLines[0];
  }

  updateName(name: string) {
    if (this.stage) {
      this.stage.name = name;
    }
  }

  updateDescription(description: string) {
    if (this.stage) {
      this.stage.description = description;
    }
  }
  
  updateContent(content: string) {
    if (this.stage) {
      this.stage.tosLines = [content];
    }
  }

  reset() {
    this.stage = null;
  }
}