import { JitterflowApi } from './JitterflowApi.credentials';

describe('JitterflowApi credential', () => {
  it('is named jitterflowApi and requires an apiKey field', () => {
    const credential = new JitterflowApi();
    expect(credential.name).toBe('jitterflowApi');

    const apiKeyField = credential.properties.find((p) => p.name === 'apiKey');
    expect(apiKeyField).toMatchObject({ required: true, typeOptions: { password: true } });
  });

  it('defaults baseUrl to the production API origin', () => {
    const credential = new JitterflowApi();
    const baseUrlField = credential.properties.find((p) => p.name === 'baseUrl');
    expect(baseUrlField?.default).toBe('https://jitterflow.io');
  });

  it('injects the API key as a Bearer Authorization header', () => {
    const credential = new JitterflowApi();
    expect(credential.authenticate).toEqual({
      type: 'generic',
      properties: {
        headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
      },
    });
  });

  it('tests the credential against GET /v1/endpoints', () => {
    const credential = new JitterflowApi();
    expect(credential.test.request).toMatchObject({ url: '/v1/endpoints', method: 'GET' });
  });
});
