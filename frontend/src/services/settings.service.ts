import { action, computed, makeObservable, observable } from "mobx";
import { Service } from "./service";

import {
  ColorMode
} from "../shared/types";

interface ServiceProvider {}

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable colorMode: ColorMode = ColorMode.DEFAULT;

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }
}
