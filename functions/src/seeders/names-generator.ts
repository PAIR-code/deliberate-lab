import { Config, starWars, uniqueNamesGenerator } from 'unique-names-generator';

const FAKE_NAME_CONFIG: Config = {
  dictionaries: [starWars],
};

export const fakeName = () => uniqueNamesGenerator(FAKE_NAME_CONFIG);
