/** Default environment configuration (used for production) */

export const environment = {
  production: true,

  cloudFunctionsUrl: 'enter your firebase cloud functions url here',

  // Google API keys (they have no business being here in the frontend, remove this later)
  oauthClientId: 'enter you oauth client id here',
  sheetsApiKey: 'enter api key for sheets api here',
  driveApiKey: 'enter api key for drive api here',
};
