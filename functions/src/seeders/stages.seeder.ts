/** Returns a default template for stages, to be stored in the templates, and ready to use for experiments */
export class StagesSeeder {
  public static createMany() {
    return [
      {
        kind: 'acceptTosAndSetProfile',
        name: '1. Agree to the experiment and set your profile',
        config: {
          pronouns: '',
          avatarUrl: '',
          name: '',
          tosLines: [],
          acceptedTosTimestamp: null,
        },
      },
      {
        kind: 'takeSurvey',
        name: '2. Initial leadership survey',
        config: {
          questions: [
            {
              kind: 'RatingQuestion',
              id: '1',
              questionText: 'Rate the items by how helpful they would be for survival.',
              item1: {
                name: 'shavingMirror',
              imageUrl:
              'https://upload.wikimedia.org/wikipedia/commons/3/32/Mirror%2C_shaving_%28AM_880330-3%29.jpg',
              },
              item2: {
                  name: 'sextant',
                  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sextant_von_Alexander_von_Humboldt.jpg/640px-Sextant_von_Alexander_von_Humboldt.jpg',
              },
              choice: null,
              confidence: null,
            },
            {
              kind: 'ScaleQuestion',
              id: '2',
              questionText: 'Rate the how much you would like to be the group leader.',
              lowerBound: 'I would most definitely not like to be the leader (0/10)',
              upperBound: 'I will fight to be the leader (10/10)',
              score: null,
            },
          ],
        },
      },
      {
        kind: 'groupChat',
        name: '3. Group discussion',
        config: {
          chatId: null, // To be set in order to be able to use relations in the database
          ratingsToDiscuss: [
            { id1: 0, id2: 1 },
            { id1: 1, id2: 2 },
            { id1: 0, id2: 2 },
          ],
          messages: [],
          items: [
            {
              name: 'shavingMirror',
              imageUrl:
              'https://upload.wikimedia.org/wikipedia/commons/3/32/Mirror%2C_shaving_%28AM_880330-3%29.jpg',
            },
            {
              name: 'sextant',
              imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sextant_von_Alexander_von_Humboldt.jpg/640px-Sextant_von_Alexander_von_Humboldt.jpg',
            },
            {
              name: 'mosquitoNetting',
              imageUrl:
              'https://commons.wikimedia.org/wiki/Category:Mosquito_nets#/media/File:Net,_mosquito_(AM_2015.20.7-1).jpg',
            },
          ],
          readyToEndChat: false,
          isSilent: true,
        },
      },
      {
        kind: 'takeSurvey',
        name: '4. Post-chat survey',
        config: {
          questions: [
            {
              kind: 'ScaleQuestion',
              id: '3',
              questionText:
                'Rate the chat dicussion on a 1-10 scale.\nAlso indicate your overall feeling about the chat.',
              lowerBound: 'I did not enjoy the discussion at all (0/10)',
              upperBound: 'The dicussion was a perfect experience to me (10/10)',
              score: null,
            },
          ],
        },
      },
      {
        kind: 'takeSurvey',
        name: '5. Post-discussion leadership survey',
        config: {
          questions: [
            {
              kind: 'ScaleQuestion',
              id: '4',
              questionText: 'Rate the how much you would like to be the group leader.',
              lowerBound: 'I would most definitely not like to be the leader (0/10)',
              upperBound: 'I will fight to be the leader (10/10)',
              score: null,
            },
          ],
        },
      },
      { kind: 'voteForLeader', name: '6. Vote for the leader', config: {} },
      {
        kind: 'takeSurvey',
        name: '7. Post-discussion work',
        config: {
          questions: [
            {
              kind: 'RatingQuestion',
              id: '5',
              questionText: 'Please rating the following accoring to which is best for survival',
              item1: {
                name: 'shavingMirror',
              imageUrl:
              'https://upload.wikimedia.org/wikipedia/commons/3/32/Mirror%2C_shaving_%28AM_880330-3%29.jpg',
              },
              item2: {
                name: 'sextant',
                imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sextant_von_Alexander_von_Humboldt.jpg/640px-Sextant_von_Alexander_von_Humboldt.jpg',
              },
              choice: null,
              confidence: null,
            },
          ],
        },
      },
      {
        kind: 'leaderReveal',
        name: '8. Leader reveal',
        config: { pendingVoteStageName: '6. Vote for the leader', revealTimestamp: null },
      },
      {
        kind: 'takeSurvey',
        name: '9. final satisfaction survey',
        config: {
          questions: [
            {
              kind: 'ScaleQuestion',
              id: '6',
              questionText:
                'Rate how happy you were with the final outcome.\nAlso indicate your overall feeling about the experience.',
              lowerBound: 'I was most definitely disappointed (0/10)',
              upperBound: 'I was very happy (10/10)',
              score: null,
            },
          ],
        },
      },
    ];
  }
}
