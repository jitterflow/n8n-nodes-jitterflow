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
} from 'n8n-workflow';

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

  return this.helpers.httpRequestWithAuthentication.call(this, 'jitterflowApi', options);
}
