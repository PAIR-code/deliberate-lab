import { computed, get, observable, makeObservable, toJS } from "mobx";

import { Service } from "../service";

import { StageKind, TermsOfServiceStageConfig } from "../../shared/types";

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

  @computed get content() {
    return this.stage?.tosLines[0];
  }

  updateName(name: string) {
    if (this.stage) {
      this.stage.name = name;
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