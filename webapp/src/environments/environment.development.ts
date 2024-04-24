/** Development environment configuration */

export const environment = {
  production: false,

  cloudFunctionsUrl: 'http://localhost:5001/friendlychat-d6dc5/us-central1',

  // Google API keys (they have no business being here in the frontend, remove this later)
  oauthClientId: 'enter you oauth client id here',
  sheetsApiKey: 'enter api key for sheets api here',
  driveApiKey: 'enter api key for drive api here',
};
