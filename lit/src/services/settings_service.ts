import { action, computed, makeObservable, observable } from "mobx";
import { Service } from "./service";

import {
  ColorMode,
  ColorTheme,
  TextSize,
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
  @observable colorTheme: ColorTheme = ColorTheme.KAMINO;
  @observable textSize: TextSize = TextSize.SMALL;

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }

  @action setColorTheme(colorTheme: ColorTheme) {
    this.colorTheme = colorTheme;
  }

  @action setTextSize(textSize: TextSize) {
    this.textSize = textSize;
  }
}
