/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
A few shot template class. This allows separating the template from the list of
values that get subsituted int it.

The implementation is very simple: few shot templates are treated as templates
concatendated by a join string.

For example:

const nameDescriptionTempl = new FewShotTempl(template
  `${namedVar('n')}, can be described in detail by: ${namedVar('d')}`,
  '\n');

See the test file (.spec) for more detailed examples.
*/

import { flatten } from 'underscore';
import { Template, escapeStr, template, nv, unEscapeStr, matchTemplate, TemplateMatch, escapeStringInMatch } from './template';
import { NamedVar } from './variable';

// For each example substitution, substitute it into the template, and join it
// all together with the joinStr, into one big new template.
export function fewShotSubst<N extends string, M extends N, N2s extends string>(
  templ: Template<N>,
  examples: { [Key in M]: string | NamedVar<N2s> }[],
  joinStr: string
): Template<Exclude<M, N> | N2s> {
  const vars = flatten(examples.map(e =>
    Object.values<string | NamedVar<N2s>>(e).filter(
      r => typeof r !== 'string'))) as NamedVar<N2s>[];
  return new Template(
    examples.map(e => templ.substs(e).escaped).join(joinStr), vars);
}

// A class representing a few shot template.
export class FewShotTemplate<Ns extends string> {
  constructor(public template: Template<Ns>,
    public joinStr: string) { };

  apply<Ms extends Ns>(
    examples: { [Key in Ms]: string }[]
  ): Template<Exclude<Ms, Ns>>;
  apply<Ms extends Ns, VarNs extends string>(
    examples: { [Key in Ms]: string | NamedVar<VarNs> }[]
  ): Template<Exclude<Ms, Ns> | VarNs>;
  apply<Ms extends Ns, VarNs extends string>(
    examples: { [Key in Ms]: string | NamedVar<VarNs> }[]
  ): Template<Exclude<Ms, Ns> | VarNs> {
    return fewShotSubst(
      this.template, examples, this.joinStr);
  }
}

export function matchFewShotTemplate<Ns extends string>(
  fewShotTempl: FewShotTemplate<Ns>, str: string
): TemplateMatch<Ns>[] {
  const matches: TemplateMatch<Ns>[] = [];
  const parts = fewShotTempl.template.parts();
  let match = matchTemplate(parts, str);
  matches.push(match);
  while (
    match.matchedPartsCount === match.parts.variables.length &&
    match.finalStr !== ''
  ) {
    let nextStr = match.finalStr
    const sepMatch = match.finalStr.match(
      `^${escapeStringInMatch(fewShotTempl.joinStr)}`);
    if (sepMatch) {
      nextStr = match.finalStr.slice(sepMatch[0].length);
    } else {
      return matches;
    }
    match = matchTemplate(parts, nextStr);
    matches.push(match);
  }
  return matches;
}
