import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class JitterflowApi implements ICredentialType {
  name = 'jitterflowApi';

  displayName = 'Jitterflow API';

  documentationUrl = 'https://jitterflow.io/docs';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'Your Jitterflow tenant API key (starts with wjg_). Find it in the Jitterflow dashboard under API Keys.',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://jitterflow.io',
      description: 'Override only for a self-hosted or non-production Jitterflow API origin.',
    },
  ];

  // Generic (non-declarative-node) auth — every request this package makes
  // goes through GenericFunctions.jitterflowApiRequest, which calls
  // helpers.httpRequestWithAuthentication with this credential name, so
  // this header injection is the single place API auth is applied.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  // Backs the "Test" button in the credential UI — GET /v1/endpoints is the
  // cheapest authenticated read on the real API (see apps/api/src/routes/
  // endpoints.ts), so a passing test here means the key genuinely works.
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/endpoints',
      method: 'GET',
    },
  };
}
