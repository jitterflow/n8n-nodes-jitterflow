import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Jitterflow } from './Jitterflow.node';

// Builds a minimal fake IExecuteFunctions — only the surface this node's
// execute() actually calls. `params` maps parameter name -> per-item value
// (or a single value applied to every item).
function buildContext(params: Record<string, unknown>, itemCount = 1) {
  const httpRequestWithAuthentication = jest.fn();

  const context = {
    getInputData: () => Array.from({ length: itemCount }, () => ({ json: {} })) as INodeExecutionData[],
    getNodeParameter: (name: string) => params[name],
    getCredentials: async () => ({ apiKey: 'wjg_test', baseUrl: 'https://jitterflow.io' }),
    getNode: () => ({ name: 'Jitterflow' }),
    continueOnFail: () => false,
    helpers: { httpRequestWithAuthentication },
  } as unknown as IExecuteFunctions;

  return { context, httpRequestWithAuthentication };
}

describe('Jitterflow node — Webhook: Send', () => {
  it('POSTs to /v1/ingest/:endpointKey with payload, targetIdentifier, and idempotencyKey', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'webhook',
      operation: 'send',
      endpointKey: 'ep_abc123',
      targetIdentifier: 'lead-42',
      idempotencyKey: 'exec-1-0',
      payload: { hello: 'world' },
    });
    httpRequestWithAuthentication.mockResolvedValue({
      jobId: 'job_1',
      scheduledFor: '2026-01-01T00:00:00Z',
      status: 'DELAYED',
    });

    const node = new Jitterflow();
    const result = await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({
        method: 'POST',
        url: 'https://jitterflow.io/v1/ingest/ep_abc123',
        body: { payload: { hello: 'world' }, targetIdentifier: 'lead-42', idempotencyKey: 'exec-1-0' },
      }),
    );
    expect(result[0][0].json).toEqual({
      jobId: 'job_1',
      scheduledFor: '2026-01-01T00:00:00Z',
      status: 'DELAYED',
    });
  });

  it('omits targetIdentifier and idempotencyKey from the body when left blank', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'webhook',
      operation: 'send',
      endpointKey: 'ep_abc123',
      targetIdentifier: '',
      idempotencyKey: '',
      payload: { a: 1 },
    });
    httpRequestWithAuthentication.mockResolvedValue({
      jobId: 'job_2',
      scheduledFor: '2026-01-01T00:00:00Z',
      status: 'DELAYED',
    });

    const node = new Jitterflow();
    await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({ body: { payload: { a: 1 } } }),
    );
  });

  it('accepts payload supplied as a JSON string (n8n JSON-type fields may arrive as strings)', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'webhook',
      operation: 'send',
      endpointKey: 'ep_abc123',
      targetIdentifier: '',
      idempotencyKey: '',
      payload: '{"a":1}',
    });
    httpRequestWithAuthentication.mockResolvedValue({
      jobId: 'job_3',
      scheduledFor: '2026-01-01T00:00:00Z',
      status: 'DELAYED',
    });

    const node = new Jitterflow();
    await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({ body: { payload: { a: 1 } } }),
    );
  });
});

describe('Jitterflow node — DLQ', () => {
  it('lists DLQ entries with a resolved=false query param for the "Unresolved Only" filter', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'dlq',
      operation: 'list',
      resolvedFilter: 'unresolved',
    });
    httpRequestWithAuthentication.mockResolvedValue([{ id: 'dlq_1' }, { id: 'dlq_2' }]);

    const node = new Jitterflow();
    const result = await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({
        method: 'GET',
        url: 'https://jitterflow.io/v1/dlq',
        qs: { resolved: 'false' },
      }),
    );
    // Array responses fan out into one output item per entry.
    expect(result[0]).toHaveLength(2);
    expect(result[0][0].json).toEqual({ id: 'dlq_1' });
  });

  it('sends no resolved filter for "All"', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'dlq',
      operation: 'list',
      resolvedFilter: 'all',
    });
    httpRequestWithAuthentication.mockResolvedValue([]);

    const node = new Jitterflow();
    await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({ qs: {} }),
    );
  });

  it('replays a DLQ job via POST /v1/dlq/:jobId/retry', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'dlq',
      operation: 'replay',
      jobId: 'job_9',
    });
    httpRequestWithAuthentication.mockResolvedValue({ status: 'requeued' });

    const node = new Jitterflow();
    const result = await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({ method: 'POST', url: 'https://jitterflow.io/v1/dlq/job_9/retry' }),
    );
    expect(result[0][0].json).toEqual({ status: 'requeued' });
  });

  it('resolves a DLQ entry via POST /v1/dlq/:jobId/resolve', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'dlq',
      operation: 'resolve',
      jobId: 'job_9',
    });
    httpRequestWithAuthentication.mockResolvedValue({ status: 'resolved' });

    const node = new Jitterflow();
    const result = await node.execute.call(context);

    expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
      'jitterflowApi',
      expect.objectContaining({ method: 'POST', url: 'https://jitterflow.io/v1/dlq/job_9/resolve' }),
    );
    expect(result[0][0].json).toEqual({ status: 'resolved' });
  });
});

describe('Jitterflow node — error handling', () => {
  it('rethrows by default when a request fails', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'dlq',
      operation: 'replay',
      jobId: 'job_missing',
    });
    httpRequestWithAuthentication.mockRejectedValue(new Error('Job not found.'));

    const node = new Jitterflow();
    await expect(node.execute.call(context)).rejects.toThrow('Job not found.');
  });

  it('captures the error per item instead of throwing when continueOnFail is set', async () => {
    const { context, httpRequestWithAuthentication } = buildContext({
      resource: 'dlq',
      operation: 'replay',
      jobId: 'job_missing',
    });
    (context as unknown as { continueOnFail: () => boolean }).continueOnFail = () => true;
    httpRequestWithAuthentication.mockRejectedValue(new Error('Job not found.'));

    const node = new Jitterflow();
    const result = await node.execute.call(context);

    expect(result[0][0].json).toEqual({ error: 'Job not found.' });
  });
});
