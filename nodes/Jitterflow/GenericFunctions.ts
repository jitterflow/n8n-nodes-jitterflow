// Thin request helper — every method maps 1:1 onto a route in
// jitterflow's apps/api/src/routes/{endpoints,ingest,dlq}.ts, the same
// contract packages/sdk-node's JitterflowClient talks to. This node is
// deliberately a dumb API client: no jitter math, no TPS guarding, no DLQ
// decisioning here — all of that stays server-side. If a route's
// request/response shape changes, update the call site here rather than
// inventing new client-side behavior.
import type {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IHttpRequestMethods,
  IDataObject,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const SIGNUP_HINT =
  "Don't have a Jitterflow API key yet? Sign up free: https://jitterflow.io/signup/?ref=n8n-node";

// The API's own 401 body ("Missing or malformed API key." / "Invalid API
// key.") is the exact moment a user without an account hits a wall — the
// highest-converting place to point them at signup, per the SEO/AEO audit's
// finding 06. Matched on message content rather than a status-code field
// since n8n's http helper's thrown-error shape isn't stable across versions;
// "API key" only appears in that one family of auth failures server-side.
function isMissingOrInvalidApiKeyError(error: unknown): error is Error {
  return error instanceof Error && /api key/i.test(error.message);
}

export async function jitterflowApiRequest(
  this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  path: string,
  body?: IDataObject,
  qs?: IDataObject,
) {
  const credentials = await this.getCredentials('jitterflowApi');
  const baseUrl = String(credentials.baseUrl || 'https://jitterflow.io').replace(/\/+$/, '');

  const options = {
    method,
    url: `${baseUrl}${path}`,
    body,
    qs,
    json: true,
  };

  try {
    return await this.helpers.httpRequestWithAuthentication.call(this, 'jitterflowApi', options);
  } catch (error) {
    if (isMissingOrInvalidApiKeyError(error)) {
      error.message = `${error.message} ${SIGNUP_HINT}`;
    }
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}
