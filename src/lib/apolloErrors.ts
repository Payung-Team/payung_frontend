import { CombinedGraphQLErrors } from '@apollo/client/errors';

/**
 * Apollo Client 4 throws GraphQL execution errors as a CombinedGraphQLErrors instance
 * (an `.errors` array), not the old Apollo Client 3 `err.graphQLErrors` shape. Extracts the
 * first server-sent error message, if any, so it can be shown to the user directly (the
 * monitoring/payment modules' Thai error strings are meant to be surfaced verbatim).
 */
export function extractGraphQLErrorMessage(err: unknown): string | undefined {
  if (CombinedGraphQLErrors.is(err)) {
    return err.errors[0]?.message;
  }
  return undefined;
}

/**
 * Extracts the first server-sent `extensions.code` (e.g. the family-group module's
 * `NOT_GROUP_OWNER`, `JOIN_LINK_EXPIRED`, …). FE code branches on this stable contract
 * rather than parsing the human-readable message. Returns undefined for network errors
 * or responses without a code.
 */
export function extractGraphQLErrorCode(err: unknown): string | undefined {
  if (CombinedGraphQLErrors.is(err)) {
    const code = err.errors[0]?.extensions?.code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
