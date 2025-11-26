/** Profile sets to use for anonymous profiles. */

/** Profile avatar constants shared across packages. */
export const WOMAN_EMOJIS = ['👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿'];
export const MAN_EMOJIS = ['👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿'];
export const PERSON_EMOJIS = ['🧑🏻', '🧑🏼', '🧑🏽', '🧑🏾', '🧑🏿'];

export const PROFILE_AVATARS = [
  ...WOMAN_EMOJIS,
  ...MAN_EMOJIS,
  ...PERSON_EMOJIS,
];

// Temporary hack: include this ID in stage ID in order to use
// anonymous profile set for display
export const SECONDARY_PROFILE_SET_ID = 'secondary_profile';
export const TERTIARY_PROFILE_SET_ID = 'tertiary_profile';

// Set names for random hashes
export const PROFILE_SET_RANDOM_1_ID = 'random-1';
export const PROFILE_SET_RANDOM_2_ID = 'random-2';
export const PROFILE_SET_RANDOM_3_ID = 'random-3';

/** First set of animals. */
export const PROFILE_SET_ANIMALS_1_ID = 'animals-1';

export const PROFILE_SET_ANIMALS_1: {name: string; avatar: string}[] = [
  {name: 'Bear', avatar: '🐻'},
  {name: 'Goose', avatar: '🪿'},
  {name: 'Buffalo', avatar: '🐃'},
  {name: 'Dog', avatar: '🐶'},
  {name: 'Cat', avatar: '🐱'},
  {name: 'Badger', avatar: '🦡'},
  {name: 'Otter', avatar: '🦦'},
  {name: 'Peacock', avatar: '🦚'},
  {name: 'Camel', avatar: '🐪'},
  {name: 'Squid', avatar: '🦑'},
  {name: 'Butterfly', avatar: '🦋'},
  {name: 'Lion', avatar: '🦁'},
  {name: 'Ram', avatar: '🐏'},
  {name: 'Alligator', avatar: '🐊'},
  {name: 'Owl', avatar: '🦉'},
  {name: 'Iguana', avatar: '🦎'},
  {name: 'Dolphin', avatar: '🐬'},
  {name: 'Whale', avatar: '🐳'},
  {name: 'Duck', avatar: '🦆'},
  {name: 'Swan', avatar: '🦢'},
  {name: 'Zebra', avatar: '🦓'},
  {name: 'Turtle', avatar: '🐢'},
  {name: 'Gorilla', avatar: '🦍'},
  {name: 'Pig', avatar: '🐷'},
  {name: 'Frog', avatar: '🐸'},
  {name: 'Hamster', avatar: '🐹'},
  {name: 'Kangaroo', avatar: '🦘'},
  {name: 'Elephant', avatar: '🐘'},
  {name: 'Unicorn', avatar: '🦄'},
  {name: 'Bat', avatar: '🦇'},
  {name: 'Llama', avatar: '🦙'},
  {name: 'Fox', avatar: '🦊'},
  {name: 'Tiger', avatar: '🐯'},
  {name: 'Hedgehog', avatar: '🦔'},
  {name: 'Snail', avatar: '🐌'},
  {name: 'Octopus', avatar: '🐙'},
  {name: 'Mouse', avatar: '🐭'},
  {name: 'Monkey', avatar: '🐵'},
  {name: 'Rabbit', avatar: '🐰'},
  {name: 'Parrot', avatar: '🦜'},
];

/* Second set of animals. */
export const PROFILE_SET_ANIMALS_2_ID = 'animals-2';

export const PROFILE_SET_ANIMALS_2: {name: string; avatar: string}[] = [
  {name: 'Panda', avatar: '🐼'},
  {name: 'Giraffe', avatar: '🦒'},
  {name: 'Cow', avatar: '🐮'},
  {name: 'Donkey', avatar: '🫏'},
  {name: 'Penguin', avatar: '🐧'},
  {name: 'Deer', avatar: '🦌'},
  {name: 'Eagle', avatar: '🦅'},
  {name: 'Unau', avatar: '🦥'},
  {name: 'Flamingo', avatar: '🦩'},
  {name: 'Jellyfish', avatar: '🪼'},
  {name: 'Shrimp', avatar: '🦐'},
  {name: 'Orangutan', avatar: '🦧'},
  {name: 'Raccoon', avatar: '🦝'},
  {name: 'Beaver', avatar: '🦫'},
  {name: 'Koala', avatar: '🐨'},
  {name: 'Honeybee', avatar: '🐝'},
  {name: 'Chipmunk', avatar: '🐿️'},
  {name: 'Chicken', avatar: '🐔'},
  {name: 'Boar', avatar: '🐗'},
  {name: 'Blowfish', avatar: '🐡'},
  {name: 'Phoenix', avatar: '🐦‍🔥'},
  {name: 'Hippopotamus', avatar: '🦛'},
  {name: 'Caterpillar', avatar: '🐛'},
  {name: 'Ewe', avatar: '🐑'},
  {name: 'Turkey', avatar: '🦃'},
  {name: 'Shark', avatar: '🦈'},
  {name: 'Wolf', avatar: '🐺'},
  {name: 'Bison', avatar: '🦬'},
  {name: 'Rhinoceros', avatar: '🦏'},
  {name: 'Goat', avatar: '🐐'},
  {name: 'Nightingale', avatar: '🐦'},
  {name: 'Seal', avatar: '🦭'},
  {name: 'Lobster', avatar: '🦞'},
  {name: 'Mammoth', avatar: '🦣'},
  {name: 'Tuna', avatar: '🐟'},
  {name: 'Ladybug', avatar: '🐞'},
  {name: 'Moose', avatar: '🫎'},
  {name: 'Leopard', avatar: '🐆'},
  {name: 'Dragon', avatar: '🐉'},
  {name: 'Horse', avatar: '🐴'},
];

/** Anonymous participant number set. */
export const PROFILE_SET_ANONYMOUS_PARTICIPANT_ID = 'anonymous-participant';

/** Nature set with flowers, rocks, etc. */
export const PROFILE_SET_NATURE_ID = 'nature';

export const PROFILE_SET_NATURE: {name: string; avatar: string}[] = [
  {name: 'Sunstone', avatar: '☀️'},
  {name: 'Halite', avatar: '🧂'},
  {name: 'Amber', avatar: '🍯'},
  {name: 'Wisteria', avatar: '💐'},
  {name: 'Glacier', avatar: '🧊'},
  {name: 'Mountain', avatar: '⛰️'},
  {name: 'Lava', avatar: '🌋'},
  {name: 'Hibiscus', avatar: '🌺'},
  {name: 'Frost', avatar: '❄️'},
  {name: 'Marble', avatar: '♟️'},
  {name: 'Opal', avatar: '🫧'},
  {name: 'Lightning', avatar: '⚡'},
  {name: 'Daisy', avatar: '🌼'},
  {name: 'Onyx', avatar: '🪨'},
  {name: 'Sapphire', avatar: '🌊'},
  {name: 'Hyacinth', avatar: '🪻'},
  {name: 'Jade', avatar: '🥬'},
  {name: 'Blossom', avatar: '🌸'},
  {name: 'Quartz', avatar: '💎'},
  {name: 'Island', avatar: '🏝️'},
  {name: 'Sunflower', avatar: '🌻'},
  {name: 'Cactus', avatar: '🌵'},
  {name: 'Obsidian', avatar: '🐈‍⬛'},
  {name: 'Amethyst', avatar: '🔮'},
  {name: 'Desert', avatar: '🏜️'},
  {name: 'Mushroom', avatar: '🍄'},
  {name: 'Cloud', avatar: '☁️'},
  {name: 'Breeze', avatar: '🌬️'},
  {name: 'Sandstone', avatar: '🧱'},
  {name: 'Citrus', avatar: '🍋'},
  {name: 'Garnet', avatar: '🌰'},
  {name: 'Seashell', avatar: '🐚'},
  {name: 'Maple', avatar: '🍁'},
  {name: 'Coral', avatar: '🪸'},
  {name: 'Leaf', avatar: '🍃'},
  {name: 'Grove', avatar: '🌳'},
  {name: 'Tulip', avatar: '🌷'},
  {name: 'Rose', avatar: '🌹'},
  {name: 'Forest', avatar: '🌲'},
  {name: 'Moonstone', avatar: '🌙'},
];
