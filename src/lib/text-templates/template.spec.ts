/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Template, escapeStr, template, nv, unEscapeStr, matchTemplate } from './template';

describe('template', () => {
  beforeEach(() => {
  });

  it('A mini walkthrough of why this is neat...', () => {
    // You can make temnplates quite naturally: you can define your variables,
    // and then just use them in a simple interpreted string.
    const thingVar = nv('thing');
    const thing2Var = nv('thing2')
    const whatIsAtoB = template`what is a ${thingVar} to ${thing2Var}?`;

    // You could also of course just inline define them...
    template`what is a ${nv('thing')} to ${nv('thing2')}?`;

    // Arguments can be auto-completed by IDE. e.g. the first you can reference
    // the variables form the 'vars' paramter of a template. e.g. this lets you
    // do string substituion in the template `whatIsAtoB` as follows where the
    // subparams of vars are 'thing' or 'thing2'; those are the only variables
    // in the template, and are auto-completed, and anything else is an 'as you
    // type' type error.
    let whatIsTabletoB = whatIsAtoB.vars.thing.substStr('table');
    expect(whatIsTabletoB.escaped).toEqual(
      'what is a table to {{thing2}}?');

    // You can also reference the var names directly using a template's
    // substution call, like so (and get editor auto-completion):
    whatIsTabletoB.substStr('thing2', 'chair');

    // And errors are checked as you type, e.g.
    //
    // whatIsTabletoB.substStr('thing', 'chair');
    //                         ^^^^^^^
    //   Error: Argument of type '"thing"' is not assignable to parameter of
    //   type '"thing2"'

    // Or you can use the map substitution and even do multiple substitutions at
    // once.
    whatIsAtoB.substs({ thing: 'table', thing2: 'chair' });

    // Variables can be progamatrically renamed in templates.
    const whatIsAtoTarget =
      whatIsAtoB.vars.thing2.renameVar('target');
    // Note: the nice automatic type inference:
    //   whatIsAtoTarget: Template<'thing', 'target'>
    expect(Object.keys(whatIsAtoTarget.vars).sort()).toEqual(
      ['thing', 'target'].sort());
    expect(whatIsAtoTarget.escaped).toEqual(
      'what is a {{thing}} to {{target}}?');

    // Variables can also be merged progamatrically too.
    const whatIsThingtoItself =
      whatIsAtoB.mergeVars(['thing', 'thing2'], 'thing');
    // Note: the nice automatic type inference:
    //   whatIsThingtoItself: Template<'thing'>
    //
    // We can verify that we merged 'thing', 'thing2' into 'thing'
    expect(Object.keys(whatIsThingtoItself.vars).sort()).toEqual(
      ['thing'].sort());

    // And we can verify the underlying escaped string value of the template
    // like so:
    expect(whatIsThingtoItself.escaped).toEqual(
      'what is a {{thing}} to {{thing}}?');

    // You can also substitute variables for templates. New extra variables are
    // corrected added in the newly created template. (whatIsTabletoBigB has the
    // variable 'bigThing' and only that one)
    const bigThingVar = nv('bigThing');
    const big = template`big ${bigThingVar}`;
    const whatIsTabletoBigB =
      whatIsTabletoB.vars.thing2.substTempl(big);

    // When you make new templates, you can also just use other templates as
    // part of them...
    const fooAndBig = template`foo ${whatIsTabletoBigB}`;
    expect(fooAndBig.escaped).toEqual(
      'foo what is a table to big {{bigThing}}?');

    // Also, variables are properies, so you can do things like check if they
    // occur in other escaped string templates too.
    expect(fooAndBig.vars.bigThing.occurs(big.escaped))
      .toBeTruthy();
  });

  it('Replacing a var with a string', () => {
    const thingVar = nv('thing');
    const p = new Template(`what is a ${thingVar}?`,
      [thingVar]);

    expect(p.varList()[0]).toBe(thingVar);

    const p2 = p.vars.thing.substStr('bar');

    expect(p2.varList().length).toBe(0);
    expect(p2.escaped).toEqual('what is a bar?');
  });

  it('Replacing a var with a template', () => {
    const thingVar = nv('thing');
    const p = new Template(`what is a ${thingVar}?`,
      [thingVar]);

    const bigVar = nv('bigThingName')
    const p2 = new Template(`big ${bigVar}`, [bigVar]);

    const p3 = p.vars.thing.substTempl(p2);

    expect(p3.escaped).toEqual(`what is a big {{bigThingName}}?`);
    expect(p3.vars.bigThingName.name).toEqual(`bigThingName`);
  });

  it('make a template with vars', () => {
    const thingVar = nv('thing');
    const thing2Var = nv('thing2')
    const p = template`what is a ${thingVar} to ${thing2Var}?`;

    const bigThingVar = nv('bigThing')
    const p2 = template`big ${bigThingVar}`;

    const p3 = p.vars.thing.substTempl(p2);

    expect(p3.escaped).toEqual(`what is a big {{bigThing}} to {{thing2}}?`);
    expect(p3.vars.bigThing.name).toEqual(`bigThing`);
  });

  it('templates substition by the variable parameter', () => {
    const thingVar = nv('thing');
    const thing2Var = nv('thing2')
    const p = template`what is a ${thingVar} to ${thing2Var}?`;

    // Cool thing about this: for the first argument, the variable, is
    // auto-completed, and errors are checked as you type.
    //  e.g. first argument is auto-completed to 'thing' or 'thing2'.
    const p2 = p.vars.thing.substStr('table');
  });

  it('escaping', () => {
    const s = 'blah \\\\ {{foo}}';
    expect(escapeStr(s)).toEqual('blah \\\\\\\\ \\{\\{foo}}');
  });

  it('unescaping', () => {
    const s = 'blah \\\\ \\{\\{foo}}';
    expect(unEscapeStr(s)).toEqual('blah \\ {{foo}}');
  });

  it('parts', () => {
    const t = template`what is an ${nv('x')} to a ${nv('y')} anyway?`;
    const parts = t.parts();
    expect(parts.prefix).toEqual('what is an ');
    expect(parts.variables.map(x => x.postfix)).toEqual([' to a ', ' anyway?']);
    expect(parts.variables.map(x => x.variable.name)).toEqual(['x', 'y']);
  });

  it('parts template matching', () => {
    const t = template`what is an ${nv('x')} to a ${nv('y')} anyway?`;
    const parts = t.parts();

    const s1 = 'what is an bug to a fly anyway?';
    const m1 = matchTemplate(parts, s1);
    expect(m1.substs).toEqual({ x: 'bug', y: 'fly' });
    expect(m1.curPart).toEqual(undefined);

    const s2 = 'what is an bug to a pants!';
    const m2 = matchTemplate(parts, s2);
    expect(m2.substs).toEqual({ x: 'bug', y: 'pants!' });
    expect(m2.curPart!.variable.name).toEqual('y');
    expect(m2.finalStr).toEqual('');

    const s3 = 'bonkers!'
    const m3 = matchTemplate(parts, s3);
    expect(m3.finalStr).toEqual(m3.str);

    const s4 = 'what is an bugfoo';
    const m4 = matchTemplate(parts, s4);
    expect(m4.substs).toEqual({ x: 'bugfoo', y: '' });
    expect(m4.curPart?.variable.name).toEqual('y');
    expect(m4.finalStr).toEqual('')
  });

  it('parts template matching with match-string', () => {
    const t = template`what is an ${nv('x', { match: '[12345]' })} to a ${nv('y')} anyway?`;
    const parts = t.parts();

    const s1 = 'what is an 3 to a fly anyway?';
    const m1 = matchTemplate(parts, s1);
    expect(m1.substs).toEqual({ x: '3', y: 'fly' });

    const s2 = 'what is an 2 to a pants!';
    const m2 = matchTemplate(parts, s2);
    expect(m2.substs).toEqual({ x: '2', y: 'pants!' });

    const s3 = 'bonkers!'
    const m3 = matchTemplate(parts, s3);
    expect(m3.finalStr).toEqual(m3.str);

    const s4 = 'what is an 4';
    const m4 = matchTemplate(parts, s4);
    expect(m4.substs).toEqual({ x: '4', y: '' });

    const s5 = 'what is an foo to a pants!';
    const m5 = matchTemplate(parts, s5);
    expect(m5.curPart?.variable.name).toEqual('x');
    expect(m5.matchedPartsCount).toEqual(0);

    const s6 = 'what is an 2 and a 3?';
    const m6 = matchTemplate(parts, s6);
    expect(m6.substs).toEqual({ x: '2', y: '' });
  });

  it('parts template matching with longer match-string', () => {
    const t = template`what is an ${nv('x', { match: '[12345]' })} to a ${nv('y')} anyway?`;

    const parts = t.parts();
    const s1 = 'what is an 3 to a fly anyway? and more';
    const m1 = matchTemplate(parts, s1);
    expect(m1.substs).toEqual({ x: '3', y: 'fly' });
    expect(m1.finalStr).toEqual(' and more');
  });

  // it('parts template matching with match-string', () => {
  //   const t = template`']\nrating: `;

  //   const parts =
  //   ` 80s cop drama with an amazing cast', 'stylish and suspenseful']
  //   rating (1 to 5 scale): 4`

  //   const parts = t.parts();
  //   const s1 = 'what is an 3 to a fly anyway?';
  //   const m1 = matchTemplate(parts, s1);
  //   expect(m1).toEqual({ x: '3', y: 'fly' });

  //   const s2 = 'what is an 2 to a pants!';
  //   const m2 = matchTemplate(parts, s2);
  //   expect(m2).toEqual({ x: '2', y: 'pants!' });

  //   const s3 = 'bonkers!'
  //   const m3 = matchTemplate(parts, s3);
  //   expect(m3).toEqual(null);

  //   const s4 = 'what is an 4';
  //   const m4 = matchTemplate(parts, s4);
  //   expect(m4).toEqual({ x: '4', y: '' });

  //   const s5 = 'what is an foo to a pants!';
  //   const m5 = matchTemplate(parts, s5);
  //   expect(m5).toEqual(null);

  //   const s6 = 'what is an 2 and a 3?';
  //   const m6 = matchTemplate(parts, s6);
  //   expect(m6).toEqual({ x: '2', y: '' });
  // });



  it('TypeScript BUG: ', () => {
    const thingVar = nv('thing');
    const thing2Var = nv('thing2')
    const p = template`what is a ${thingVar} to ${thing2Var}?`;

    const bigThingVar = nv('bigThing')
    const p2 = template`big ${bigThingVar}`;
    const p4 = template`foo ${bigThingVar}, bar ${thingVar}, and ${thing2Var}`;

    // BUG, the following line produces this error:
    /*
Argument of type 'Template<"thing" | "person">' is not assignable to parameter of type 'Variable<"bigThing"> | Template<"bigThing">'.
Type 'Template<"thing" | "thing2">' is not assignable to type 'Template<"bigThing">'.
Types of property 'vars' are incompatible.
  Property 'bigThing' is missing in type '{ thing: Variable<"thing">; person: Variable<"person">; }' but required in type '{ bigThing: Variable<"bigThing">; }'.ts(2345)
    */
    // const p3 = template`foo ${p2}, bar ${p}`;

    // TODO: complete the test once the bug is fixed...
    // expect(p3.template).toEqual(
    //   `foo what is {{thing}} to {{person}}, bar {{bigThing}}?`);
    // expect(p3.vars.bigThing.name).toEqual(bigThingHole.name);
    // expect(p3.vars.person.name).toEqual(personHole.name);
  });
});

