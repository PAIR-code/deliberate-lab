/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { RegExpVar } from './variable';

describe('named variables', () => {
  beforeEach(() => {
  });

  it('occurs', () => {
    // You can prompts quite vaturally, you define your variables, and then
    // just use them in a string interpretation.
    const thingVar = new RegExpVar('thing');
    const bigThingVar = new RegExpVar('bigThing');
    // Variables are first class properies, and you can do stuff with them.
    expect(bigThingVar.occurs('blah {{bigThing}}')).toBeTruthy();
    expect(thingVar.occurs('blah {{bigthing}}')).toBeFalsy();
  });

  it('Substituting a var in a string', () => {
    const thingVar = new RegExpVar('thing');
    const s2 = thingVar.subst(`what is a ${thingVar}?`, 'bar');
    expect(s2).toEqual('what is a bar?');
  });

  // Sadly there is no way to override loose equality for classes in JS.
  // it('equals', () => {
  //   // You can prompts quite vaturally, you define your variables, and then
  //   // just use them in a string interpretation.
  //   const thingVar = new RegExpVar('thing');
  //   const thingVar2 = new RegExpVar('thing');
  //   // Variables are first class properies, and you can do stuff with them.
  //   expect(thingVar == thingVar2).toBeTruthy();
  // });
});

