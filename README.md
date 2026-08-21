# n8n-nodes-jitterflow

An [n8n](https://n8n.io) community node for [Jitterflow](https://jitterflow.io) — jittered, rate-limited webhook delivery with a dead-letter queue.

## What it does

- **Webhook -> Send**: queues a webhook for delayed, jittered redelivery via `POST /v1/ingest/:endpointKey`. Supports a per-item `Target Identifier` (paces delivery per mailbox/lead/etc. instead of per endpoint) and an `Idempotency Key` that defaults to `{{$execution.id}}-{{$itemIndex}}`, so a workflow retry never double-sends.
- **DLQ -> List / Replay / Resolve**: manage the dead-letter queue from inside a workflow — list failed deliveries, one-click replay a job for immediate redelivery, or mark an entry resolved without retrying.

All jitter math, TPS guarding, and DLQ decisioning happen server-side in Jitterflow — this node is a thin, typed client over the real REST API (the same contract `@jitterflow/sdk-node` uses).

## Install

**Self-hosted n8n**: Settings -> Community Nodes -> install `n8n-nodes-jitterflow`.

**n8n Cloud**: available once the node passes n8n's verification review (submission tracked in `docs/n8n-integration.md` at the repo root).

## Credential

Create a **Jitterflow API** credential with your tenant API key (Jitterflow dashboard -> API Keys, starts with `wjg_`). Use the "Test" button to confirm it against `GET /v1/endpoints`.

## Development

```
npm run build --workspace=n8n-nodes-jitterflow   # n8n-node build
npm run lint --workspace=n8n-nodes-jitterflow    # n8n-node lint — the verification-readiness check
npm run test --workspace=n8n-nodes-jitterflow
npm run test:integration --workspace=n8n-nodes-jitterflow   # needs DB/Redis, same as every other package
```

Real-n8n-instance e2e (installs the built node into an actual n8n container and runs a real workflow through it):

```
npm run test:e2e:n8n:docker
```

## Release

```
npm run release --workspace=n8n-nodes-jitterflow
```

Bumps the version, tags, and pushes — `.github/workflows/n8n-node-release.yml` takes it from there (build, `n8n-node lint`, publish to npm with provenance). Requires the `NPM_TOKEN` repo secret; see `docs/n8n-integration.md`.
