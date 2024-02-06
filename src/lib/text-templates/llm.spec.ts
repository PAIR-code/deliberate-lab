/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
Showing how the LLM class works...
*/

import { LookupTableFakeLLM, PredictResponse, ScoreResponse, ScoredCompletion, assertNoErrorResponse, fillTemplate, isErrorResponse } from "./llm";
import { Palm2Response, preparePalm2Request } from "./llm_vertexapi_palm2";
import { nv, template } from "./template";

describe('llm', () => {
  let fakeLLM: LookupTableFakeLLM;
  let stopString = `']`;

  beforeEach(() => {
    // ----------------------------------------------------------------------------
    // Setup a fake LLM...
    // ----------------------------------------------------------------------------
    const fakePromptInput1 = `.
The following are short movie summaries. They are specific, not generic (no movie is  just "a classic"), and they don't contain plot synopsis. They just describe my experience of the movie.

movie: 'Fifth Element'
summary: ['a joyous sci fi that emerses you in a colourful universe', 'quirky upbeat action']

movie: 'Seven Samurai'
summary: ['a black and white masterpiece of cinematography', 'a slow, atmospheric, symbolic fight for all that is just']

movie: 'The Godfather'
summary: ['`;

    const fakePromptInput2 = `.
The following are short movie summaries. They are specific, not generic (no movie is just "a classic"), and they don't contain plot synopsis. They just describe the experience of watching the movie. It tries to tell you the essence of the movie.

movie: 'Fifth Element'
summary: ['joyous sci fi that emerses you in a colourful universe', 'quirky upbeat action']
synopsis: 'The 23rd century, a New York City cabbie, Korben Dallas (Bruce Willis), finds the fate of the world in his hands when Leeloo (Milla Jovovich) falls into his cab. As the embodiment of the fifth element, Leeloo needs to combine with the other four to keep the approaching Great Evil from destroying the world.'

movie: 'Seven Samurai'
summary: ['black and white masterpiece of cinematography', 'a slow, atmospheric, symbolic fight for all that is just']
rating (1 to 5 scale): 5

movie: 'The Untouchables'
summary: ['`;

    /* An approxiation for...
    const request = preparePalm2Request(prompt);
    const response = await sendPalm2Request(..., request)
    */
    function makeFakeResponse(responses: string[]): Palm2Response {
      return {
        "predictions": responses.map(s => (
          {
            "content": s,
            "citationMetadata": { "citations": [] },
            "safetyAttributes": { "scores": [], "blocked": false, "categories": [] }
          })),
        "metadata": {
          "tokenMetadata": {
            "outputTokenCount": { "totalBillableCharacters": 279, "totalTokens": 65 },
            "inputTokenCount": { "totalBillableCharacters": 410, "totalTokens": 118 }
          }
        }
      };
    }

    const fakeResponse1 = makeFakeResponse([
      "an operatic tale of a powerful family",
      "an operatic tragedy about a powerful Italian American crime family', 'a sprawling epic of violence and betrayal",
      "epic crime saga with iconic performances', 'an operatic tale of family, loyalty, and betrayal",
      "a timeless mafia masterpiece', 'an operatic tale of a family\\'s descent into darkness",
    ].map(s => s + stopString));

    const fakeResponse2 = makeFakeResponse([" 80s cop drama with an amazing cast', 'stylish and suspenseful']\nrating (1 to 5 scale): 4",
      " stylish and gritty gangster movie of the prohibition era', 'the classic good vs evil tale']\nrating (1 to 5 scale): 4.5\n\nmovie: 'The Shawshank Redemption'\nsummary: ['a film with a very hopeful message', 'redemption, friendship and a little bit of hope']\nrating (1 to 5 scale): 5\n",
      " stylish and violent prohibition era gangster movie', 'DeNiro and Connery are excellent']\nsynopsis: 'When a bootlegger is caught by the police and is released on bail, he is given one week to leave Chicago. During this time, he hires an accountant to get all his financial affairs in order. However, the accountant is an undercover agent who plans to gather evidence and bring him to justice.'\n",
      // This example shows how string escaping often fails...
      " fast paced, stylish action', 'a stylish piece of filmmaking with great performances and one-liners']\nsynopsis: 'Federal agent Eliot Ness (Kevin Costner) sets out to stop bootlegger Al Capone (Robert De Niro). To get him, Ness puts together a team of 11 men who are all willing to risk their lives to bring down Capone and his associates.'\n\nmovie: 'The Shining'\nsummary: ['uncomfortable, haunting, and disorienting', 'a masterclass in horror']\nsynopsis: 'Jack Torrance (Jack Nicholson) becomes the caretaker of the Overlook Hotel, a massive, isolated resort in the Colorado mountains. His son, Danny (Danny Lloyd), possesses psychic abilities that allow him to see visions of the hotel's violent past. As Jack's sanity deteriorates, he becomes increasingly violent and Danny must find a way to escape the hotel before it's too late.'\n"
    ]);

    function makeScoredCompletions(query: string, response: Palm2Response): ScoreResponse {
      return {
        scoredCompletions: response.predictions.map(p => {
          return { query, completion: p.content, score: 0 }
        })
      };
    }

    const lookupTable: { [query: string]: ScoreResponse } = {};
    lookupTable[fakePromptInput1] = makeScoredCompletions(fakePromptInput1, fakeResponse1);
    lookupTable[fakePromptInput2] = makeScoredCompletions(fakePromptInput2, fakeResponse2);
    fakeLLM = new LookupTableFakeLLM(lookupTable);
  });

  // ----------------------------------------------------------------------------
  // Now the tests really start...
  // ----------------------------------------------------------------------------
  it('llm template filling', async () => {
    const promptTempl = template`.
The following are short movie summaries. They are specific, not generic (no movie is  just "a classic"), and they don't contain plot synopsis. They just describe my experience of the movie.

movie: 'Fifth Element'
summary: ['a joyous sci fi that emerses you in a colourful universe', 'quirky upbeat action']

movie: 'Seven Samurai'
summary: ['a black and white masterpiece of cinematography', 'a slow, atmospheric, symbolic fight for all that is just']

movie: '${nv('movie')}'
summary: ['${nv('summary')}']`;

    const substsList = await fillTemplate(
      fakeLLM, promptTempl.substs({ movie: 'The Godfather' }));
    assertNoErrorResponse(substsList);
    expect(substsList.length).toEqual(4);
    expect(substsList[0].substs!.summary).toEqual(`an operatic tale of a powerful family`);
    expect(substsList[1].substs!.summary).toEqual(`an operatic tragedy about a powerful Italian American crime family', 'a sprawling epic of violence and betrayal`);
    expect(substsList[2].substs!.summary).toEqual(`epic crime saga with iconic performances', 'an operatic tale of family, loyalty, and betrayal`);
    expect(substsList[3].substs!.summary).toEqual(`a timeless mafia masterpiece', 'an operatic tale of a family\\'s descent into darkness`);
  });

  // ----------------------------------------------------------------------------
  // Now the tests really start...
  // ----------------------------------------------------------------------------
  it('llm template filling with custom regexp', async () => {
    const movie = "The Untouchables"

    const t = template`.
The following are short movie summaries. They are specific, not generic (no movie is just "a classic"), and they don't contain plot synopsis. They just describe the experience of watching the movie. It tries to tell you the essence of the movie.

movie: 'Fifth Element'
summary: ['joyous sci fi that emerses you in a colourful universe', 'quirky upbeat action']
synopsis: 'The 23rd century, a New York City cabbie, Korben Dallas (Bruce Willis), finds the fate of the world in his hands when Leeloo (Milla Jovovich) falls into his cab. As the embodiment of the fifth element, Leeloo needs to combine with the other four to keep the approaching Great Evil from destroying the world.'

movie: 'Seven Samurai'
summary: ['black and white masterpiece of cinematography', 'a slow, atmospheric, symbolic fight for all that is just']
rating (1 to 5 scale): 5

movie: '${nv('movie')}'
summary: ['${nv('summaries')}']
rating (1 to 5 scale): ${nv('rating', { match: '[12345](\.\\d)?' })}
synopsis: '${nv('synopsis')}'`;

    const responses = await fillTemplate(fakeLLM, t.substs({ movie }));
    assertNoErrorResponse(responses);
    expect(responses[0].substs!.summaries).toEqual(` 80s cop drama with an amazing cast', 'stylish and suspenseful`);
    expect(responses[0].substs!.rating).toEqual(`4`);
    expect(responses[1].substs!.summaries).toEqual(` stylish and gritty gangster movie of the prohibition era', 'the classic good vs evil tale`);
    expect(responses[1].substs!.rating).toEqual(`4.5`);
  });
});

