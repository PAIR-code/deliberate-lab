import { computed, makeObservable, observable } from "mobx";

import { Service } from "../service";

import { InfoStageConfig } from "@llm-mediation-experiments/utils";

/** Manages metadata for info stage config. */
export class InfoConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable stage: InfoStageConfig|null = null;

  @computed get name() {
    return this.stage?.name;
  }

  @computed get description() {
    return this.stage?.description ?? '';
  }

  @computed get popupText() {
    return this.stage?.popupText ?? '';
  }

  @computed get content() {
    return this.stage?.infoLines.join('\n\n');
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
 
  updatePopupText(popupText: string) {
    if (this.stage) {
      this.stage.popupText = popupText;
    }
  }

  updateContent(content: string) {
    if (this.stage) {
      this.stage.infoLines = [content];
    }
  }

  reset() {
    this.stage = null;
  }
}