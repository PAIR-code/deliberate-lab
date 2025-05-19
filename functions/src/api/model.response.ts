export enum ModelResponseStatus {
  // A successful response.
  OK = 'ok',
  // The provider returned an otherwise-valid response, but Deliberate Lab
  // couldn't parse it in the expected structured output format. The plaintext
  // response will be present in the text field.
  STRUCTURED_OUTPUT_PARSE_ERROR = 'structured_output_parse_error',
  // The provider didn't accept the authentication for this request, e.g.
  // because of a missing or invalid API key.
  AUTHENTICATION_ERROR = 'authentication_error',
  // The provider denied the request because the account ran out of quota or funds.
  QUOTA_ERROR = 'quota_error',
  // Deliberate Lab couldn't reach the provider, or received a server error
  // response. This error may be transient.
  PROVIDER_UNAVAILABLE_ERROR = 'provider_unavailable_error',
  // The provider refused the request for policy or safety reasons.
  REFUSAL_ERROR = 'refusal_error',
  // The response reached the configured output token limit and was terminated
  // early. The partial response will be present in the text field.
  LENGTH_ERROR = 'length_error',
  // The agent's config is invalid.
  CONFIG_ERROR = 'config_error',
  // Deliberate Lab encountered an internal error.
  INTERNAL_ERROR = 'internal_error',
  // Catchall category for errors not covered above.
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Common interface for all model responses.
 */
export interface ModelResponse {
  status: ModelResponseStatus;
  // The model's response, in plaintext. Null if the provider didn't return a response.
  text?: string;
  // TODO(mkbehr): Parse the response during response creation.
  parsedResponse?: object;
  errorMessage?: string;
}
