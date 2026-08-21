import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { Server } from 'http';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { app } from '@jitterflow/api/src/app';
import { redis } from '@jitterflow/api/src/redis';
import { prisma } from '@jitterflow/db';
import { Jitterflow } from './Jitterflow.node';

// Same shape as packages/sdk-node/src/client.integration.test.ts: boots the
// real apps/api Express app on an ephemeral local port so this only needs
// DB/Redis (whatever test:integration already runs against), not a
// separately-running api process. Unlike the sdk-node test, the thing under
// test here is the node's execute() — so the fake IExecuteFunctions'
// helpers.httpRequestWithAuthentication makes a REAL fetch() against that
// server, applying the same Authorization header injection
// JitterflowApi.credentials.ts's `authenticate` block declares, so this
// exercises the exact request Jitterflow.node.ts builds end to end.

let server: Server;
let baseUrl: string;
const createdTenantIds: string[] = [];

async function createTestTenant() {
  const apiKey = `wjg_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 4);
  const tenant = await prisma.tenant.create({
    data: {
      name: 'n8n node integration test tenant',
      email: `n8n-node-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      apiKeyHash,
      planTier: 'PRO', // dlqReplayEnabled is gated off on DEVELOPER — this suite exercises Replay too.
      maxTps: 5,
      status: 'ACTIVE',
    },
  });
  createdTenantIds.push(tenant.id);
  return { tenant, apiKey };
}

async function createTestEndpoint(tenantId: string) {
  return prisma.endpointConfig.create({
    data: {
      tenantId,
      name: 'n8n node integration endpoint',
      destinationUrl: 'https://example.com/n8n-node-test',
    },
  });
}

function buildRealContext(apiKey: string, params: Record<string, unknown>, itemCount = 1) {
  return {
    getInputData: () => Array.from({ length: itemCount }, () => ({ json: {} })) as INodeExecutionData[],
    getNodeParameter: (name: string) => params[name],
    getCredentials: async () => ({ apiKey, baseUrl }),
    getNode: () => ({ name: 'Jitterflow' }),
    continueOnFail: () => false,
    helpers: {
      httpRequestWithAuthentication: async (
        _credentialType: string,
        options: { method: string; url: string; body?: unknown; qs?: Record<string, string> },
      ) => {
        const url = new URL(options.url);
        if (options.qs) Object.entries(options.qs).forEach(([k, v]) => url.searchParams.set(k, v));

        const res = await fetch(url, {
          method: options.method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const raw = await res.text();
        const data = raw ? JSON.parse(raw) : undefined;
        if (!res.ok) throw new Error((data && data.error) || res.statusText);
        return data;
      },
    },
  } as unknown as IExecuteFunctions;
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to determine ephemeral server port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
  await prisma.$disconnect();
  redis.disconnect();
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

describe('Jitterflow node against a real api instance', () => {
  it('Send Webhook produces a real 202 job via POST /v1/ingest/:endpointKey', async () => {
    const { tenant, apiKey } = await createTestTenant();
    const endpoint = await createTestEndpoint(tenant.id);

    const node = new Jitterflow();
    const context = buildRealContext(apiKey, {
      resource: 'webhook',
      operation: 'send',
      endpointKey: endpoint.endpointKey,
      targetIdentifier: '',
      idempotencyKey: '',
      payload: { hello: 'n8n' },
    });

    const result = await node.execute.call(context);
    expect(result[0][0].json).toMatchObject({ status: 'DELAYED' });
    expect((result[0][0].json as { jobId: string }).jobId).toBeDefined();
  });

  it('DLQ List / Replay / Resolve round-trip against real seeded DLQ state', async () => {
    const { tenant, apiKey } = await createTestTenant();
    const endpoint = await createTestEndpoint(tenant.id);

    const job = await prisma.webhookJob.create({
      data: {
        tenantId: tenant.id,
        endpointConfigId: endpoint.id,
        targetIdentifier: endpoint.endpointKey,
        payload: { hello: 'dlq' },
        status: 'FAILED',
        scheduledFor: new Date(),
      },
    });
    await prisma.dLQLog.create({
      data: {
        jobId: job.id,
        endpointId: endpoint.id,
        failedReason: 'ECONNREFUSED',
        lastPayload: { hello: 'dlq' },
        resolved: false,
      },
    });

    const node = new Jitterflow();

    const listResult = await node.execute.call(
      buildRealContext(apiKey, { resource: 'dlq', operation: 'list', resolvedFilter: 'unresolved' }),
    );
    expect(listResult[0].some((item) => (item.json as { jobId: string }).jobId === job.id)).toBe(true);

    const replayResult = await node.execute.call(
      buildRealContext(apiKey, { resource: 'dlq', operation: 'replay', jobId: job.id }),
    );
    expect(replayResult[0][0].json).toEqual({ status: 'requeued' });
    const requeued = await prisma.webhookJob.findUnique({ where: { id: job.id } });
    expect(requeued?.status).toBe('QUEUED');

    const resolveResult = await node.execute.call(
      buildRealContext(apiKey, { resource: 'dlq', operation: 'resolve', jobId: job.id }),
    );
    expect(resolveResult[0][0].json).toEqual({ status: 'resolved' });
    const dlqLog = await prisma.dLQLog.findFirst({ where: { jobId: job.id } });
    expect(dlqLog?.resolved).toBe(true);
  });

  it('surfaces a 404 from the real API as a thrown error', async () => {
    const { apiKey } = await createTestTenant();
    const node = new Jitterflow();
    const context = buildRealContext(apiKey, {
      resource: 'dlq',
      operation: 'replay',
      jobId: 'not-a-real-id',
    });

    await expect(node.execute.call(context)).rejects.toThrow('Job not found.');
  });
});
