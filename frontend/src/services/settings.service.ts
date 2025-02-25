import {action, computed, makeObservable, observable} from 'mobx';
import {Service} from './service';

import {ColorMode} from '../shared/types';

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable colorMode: ColorMode = ColorMode.DEFAULT;

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }
}
