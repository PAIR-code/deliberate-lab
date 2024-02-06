/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
An implementation of named nariables that can occur in a string template.
*/

export abstract class NamedVar<N extends string> {
  public abstract contentMatchStr?: string;

  constructor(public name: N) { };

  // Apply the substitution, replacing this variable in `s` with the value
  // string.
  public abstract subst(s: string, value: string): string;

  // Split the string whereever this variable occurs.
  public abstract split(s: string): string[];

  // Returns true if 's' contains occurances of this variable.
  // Properties:
  //   Forall s, s': if (!x.occurs(s)) then (x.applyFn(s, s') === s)
  //   (x.split(s).length === 1) <=iff=> (x.occurs(s) === false)
  public occurs(s: string): boolean {
    return Object.values(this.split(s)).length > 1;
  }

  // Provides a literal string for the substitution.
  // Key property:
  //   Forall s: x.applyFn(s, x.literalStr()) === s
  public abstract literal: string;
}


// Assumes that regexp matches /.*${literal}.*/
// (Required for the RegExpVar literal/applyFn property.
export interface RegExpVarOptions {
  // A regexp-string that the content of this variable must match.
  // The reason this is not a full RegExp is that it cannot specify regexp
  // flags, e.g. /.../g
  // It also should not include the $ or ^ markers (match end/start of regexp.
  // This is intented to be part of the regexp used to control generation, or
  // match the output in a template.
  match?: string,

  // Optional string that much match right after the variable.
  postVarMatch?: string;
}

// Example usage:
//   const r = 'did you know that a {{foo}} is a {{bar}}.'.split(VAR_REGEXP);
// r = ['did you know that a ', '{{foo}}', ' is a ', '{{bar}}', '.']
// Property: every other value (the odd indexes) is a variable.
// We could use `\\{\\{([^(\\}\\})]*)\\}\\}` as our regexp to also remove
// variable marker parenthesis, but we don't do that because it's good to be
// able to easily visually inspect what's what. Maybe we'll change it later.
// export const VAR_REGEXP_STR = `(\\{\\{.*?\\}\\})`;
export const VAR_REGEXP_STR = `(\\{\\{[^(\\}\\})]*\\}\\})`;
// export const SPLIT_REGEXP_STR = `\\{\\{(.*?)\\}\\}`;
export const SPLIT_REGEXP_STR = `\\{\\{([^(\\}\\})]*)\\}\\}`;
export const SPLIT_REGEXP = new RegExp(SPLIT_REGEXP_STR, 'g');
export const VAR_REGEXP = new RegExp(VAR_REGEXP_STR, 'g');
export const PREFIX_REGEXP = new RegExp(`$([^(\\{\\{)]*)`);

export class RegExpVar<N extends string> extends NamedVar<N> {
  // A regexp that the content of this variable must match.
  // contentRegexp: RegExp;

  // The matcher for the literal in the template.
  literalRegExp: RegExp;

  // This is the actual string value in the template that the variable has.
  // The template's escaping must make sure that this cannot occcur as part of
  // the template, except as this variable.
  literal: string;

  // Regexp as a string to match content.
  public contentMatchStr?: string;

  constructor(name: N, options?: RegExpVarOptions) {
    super(name);
    if (options && options.match) {
      this.contentMatchStr = options.match;
    }
    // else {
    //  this.contentMatchStr = '.+?';
    //}
    this.literal = `{{${this.name}}}`;
    // TODO: consider doing this automatically by escaling this.literal
    this.literalRegExp = new RegExp(`\\{\\{${this.name}\\}\\}`, 'g');
  }

  // static splitAllVars(s: string): string[] {
  //   return s.split(VAR_REGEXP);
  // }

  public subst(s: string, value: string): string {
    return s.replace(this.literalRegExp, value);
  }
  public split(s: string): string[] {
    return s.split(this.literalRegExp);
  }

  override toString(): string {
    return this.literal;
  }
}
