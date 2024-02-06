/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { flatten } from 'underscore';
import { Template, escapeStr, template, nv, unEscapeStr, matchTemplate } from './template';
import { NamedVar } from './variable';
import { FewShotTemplate, matchFewShotTemplate } from './fewshot_template';

// // ----------------------------------------------------------------------------
// const movieSuggestionPrompt: Template<never> = template``;

// Idea: flow graphs: track the graph of substs.

// Idea: treat lists as first class objects where the template bunches a set of
// vars, and knows how to seprate repetitions of them.

// Idea: abstraction: generate a variable (have a stopping condition as first
// class entity.


describe('fewshot_template', () => {
  beforeEach(() => {
  });

  it('A mini walkthrough of why this is neat...', () => {

    // ----------------------------------------------------------------------------
    // ----------------------------------------------------------------------------
    const criteriaPoints = [
      {
        name: 'Concise',
        description: 'not waffley.'
      },
      {
        name: 'No synposes',
        description: 'do not give plot synopses.'
      },
      {
        name: 'Specific',
        description: 'not vague (i.e. not "an amazing movie.", "a classic.").'
      },
    ];
    const nCriteriaTempl = new FewShotTemplate(template
      `(${nv('number')}) ${nv('name')}: ${nv('description')}`,
      '\n');
    const numberedCriteriaPoints =
      criteriaPoints.map((e, i) => { return { ...e, number: `${i + 1}` } });
    const criteriaTempl: Template<never> = nCriteriaTempl.apply(
      numberedCriteriaPoints);

    expect(criteriaTempl.escaped).toEqual(
      `(1) Concise: not waffley.
(2) No synposes: do not give plot synopses.
(3) Specific: not vague (i.e. not "an amazing movie.", "a classic.").`);

    // ----------------------------------------------------------------------------
    // Probably too clever... but showing how you can have meta-templates.
    // e.g. creating a common structure for propeties and values, and apply it
    // to create a few-shot template with
    //    Move: {{movie}}
    //    Recommendation: {{recommendation}}
    // And showing how this can be easily progamatically extended to:
    //    Move: {{movie}}
    //    Recommendation: {{recommendation}}
    //    Evaluation: {{evaluation}}
    // The Motivation to do this is to make sure that you get consistent
    // joining, e.g. ": " always separates the property from the value, and
    // "\n" always separates different property-vcalue pairs.
    const nPropertyValuePerLineTempl = new FewShotTemplate(template
      `${nv('property')}: "${nv('value')}"`,
      '\n');
    const movieAndRecList = [
      {
        property: 'Movie',
        value: nv('movie'),
      },
      {
        property: 'Recommendation',
        value: nv('recommendation'),
      }
    ];
    const movieRecTempl = nPropertyValuePerLineTempl.apply(movieAndRecList);
    const movieRecEvalTempl =
      nPropertyValuePerLineTempl.apply(
        [...movieAndRecList,
        {
          property: 'Evaluation',
          value: nv('evaluation'),
        }]);

    expect(movieRecEvalTempl.escaped).toEqual(
      `Movie: "{{movie}}"
Recommendation: "{{recommendation}}"
Evaluation: "{{evaluation}}"`);

    // ----------------------------------------------------------------------------
    const fewShotCriticExamples = [
      {
        movie: 'The Godfather',
        recommendation: 'a dark and violent story of family and power',
        evaluation: 'ok',
      },
      {
        movie: 'The Godfather',
        recommendation: 'a masterpiece of cinema',
        evaluation: 'Specific: the recommendation is vague, it should be more precise.'
      },
    ];

    const nCriticExamplesTempl = new FewShotTemplate(
      movieRecEvalTempl, '\n\n');

    // ----------------------------------------------------------------------------
    // Tenplates can contain other templates inline also.
    const criticTempl = template
      `Given the following criteria for movie recommendations:
${nv('Constitution')}

Evaluate the following movie recommendations.
If the review is ok, the evaluation should just be "ok".

${nv('fewShotCriticExamples')}

${movieRecTempl}
Evaluation: "`;

    const criticWithConstitutionAndExamples = criticTempl.substs({
      Constitution: criteriaTempl.escaped,
      fewShotCriticExamples:
        nCriticExamplesTempl.apply(fewShotCriticExamples).escaped
    });

    expect(criticWithConstitutionAndExamples.escaped).toEqual(
      `Given the following criteria for movie recommendations:
(1) Concise: not waffley.
(2) No synposes: do not give plot synopses.
(3) Specific: not vague (i.e. not "an amazing movie.", "a classic.").

Evaluate the following movie recommendations.
If the review is ok, the evaluation should just be "ok".

Movie: "The Godfather"
Recommendation: "a dark and violent story of family and power"
Evaluation: "ok"

Movie: "The Godfather"
Recommendation: "a masterpiece of cinema"
Evaluation: "Specific: the recommendation is vague, it should be more precise."

Movie: "{{movie}}"
Recommendation: "{{recommendation}}"
Evaluation: "`);
  });

  it('parts template matching with multi-line match-string', () => {
    const itemExperienceTempl = template`Short experience description: "${nv('experience')}"
About: ${nv('aboutEntity')} (${nv('aboutDetails')})
Liked or Disliked: ${nv('likedOrDisliked')}, because:
[
  ${nv('characteristics')}
]`;

    const t = itemExperienceTempl.substs({
      experience: 'The Garden of Forking Paths: like it'
    });

    const parts = t.parts();
    const s1 = "The Garden of Forking Paths (short story by Jorge Luis Borges)\nLiked or Disliked: Liked, because:\n[\n  \"Intriguing\",\n  \"Philosophical\",\n  \"Thought-provoking\"\n]\n\nfoo foo\n]";
    const m1 = matchTemplate(parts, s1, false);
    expect(m1.substs).toEqual({
      aboutEntity: 'The Garden of Forking Paths',
      aboutDetails: 'short story by Jorge Luis Borges',
      likedOrDisliked: 'Liked',
      characteristics: '\"Intriguing\",\n  \"Philosophical\",\n  \"Thought-provoking\"'
    });
  });

  it('match fewshot template', () => {
    const templ = new FewShotTemplate(template
      `(${nv('id')}) ${nv('property')}: "${nv('value')}"`,
      '\n');

    const str = `(1) Concise: "not waffley"
(2) No synposes: "do not give plot synopses"
(3) Specific: "not vague (i.e. not 'an amazing movie.', 'a classic.')"`;

    const m = matchFewShotTemplate(templ, str);
    expect(m.length).toEqual(3);
    expect(m[0].substs).toEqual({ id: '1', property: 'Concise', value: 'not waffley' });
    expect(m[0].curPart).toEqual(undefined);
    expect(m[1].substs).toEqual({ id: '2', property: 'No synposes', value: 'do not give plot synopses' });
    expect(m[1].curPart).toEqual(undefined);
    expect(m[2].substs).toEqual({ id: '3', property: 'Specific', value: 'not vague (i.e. not \'an amazing movie.\', \'a classic.\')' });
    expect(m[2].curPart).toEqual(undefined);
  });
});
